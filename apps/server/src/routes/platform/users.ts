import { createEmailVerificationToken } from 'better-auth/api';
import { auth } from '../../lib/auth';
import { recordEvent } from '../../lib/audit';
import { getUrls } from 'shared';
import { validProfileLink } from 'shared/profile-links';
import { status, t } from 'elysia';
import { eq, and, or, ilike, asc, desc, count, gt } from 'drizzle-orm';
import {
  users,
  auditEvents,
  outbox,
  sessions,
  frontendSessions,
  verifications,
  mailJobs
} from '../../db';
import { createElysia, requirePermission } from '../../lib/createElysia';
import { manageUser, anonymizeUser } from '../../services/users';
import { effectivePermissions, type Permission } from '../../domain/permissions';
export const userRoutes = createElysia({ prefix: '/users', protectedRoute: true })
  .get('/me', ({ user }) => ({ user, permissions: user ? [...effectivePermissions(user)] : [] }))
  .get(
    '/search',
    async ({ query: { q }, db }) => {
      const parts = q.split(' ').map((p) => `%${p}%`);
      const limit = 10;
      if (!q) return [];

      const searchPattern = `%${q.replace(/_/g, ' ')}%`;
      return db
        .select({
          id: users.id,
          name: users.name,
          nickname: users.nickname,
          image: users.image
        })
        .from(users)
        .where(
          or(
            ilike(users.name, searchPattern),
            ilike(users.nickname, searchPattern),
            ilike(users.firstName, searchPattern),
            ilike(users.lastName, searchPattern)
          )
        )
        .limit(limit);
    },
    { query: t.Object({ q: t.String() }) }
  )
  .patch(
    '/me',
    async ({ user, body, db }) => {
      const mappings: Record<string, Permission> = {
        firstName: 'users.profile.edit-first-name',
        lastName: 'users.profile.edit-last-name',
        nickname: 'users.profile.edit-nickname',
        bio: 'users.profile.edit-bio',
        github: 'users.profile.edit-social-links',
        linkedin: 'users.profile.edit-social-links',
        publicPrivacy: 'users.profile.edit-privacy'
      };
      for (const key of Object.keys(body)) requirePermission(user, mappings[key]!);
      if (!user) throw status(401);
      for (const provider of ['github', 'linkedin'] as const)
        if (!validProfileLink(provider, body[provider]))
          throw status(422, {
            code: provider === 'github' ? 'INVALID_GITHUB_URL' : 'INVALID_LINKEDIN_URL',
            message:
              provider === 'github'
                ? 'Use a https://github.com/username profile link.'
                : 'Use a https://linkedin.com/in/username profile link.'
          });
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(users)
          .set({
            ...body,
            name:
              [body.firstName ?? user.firstName, body.lastName ?? user.lastName]
                .filter(Boolean)
                .join(' ') || user.name
          })
          .where(eq(users.id, user.id))
          .returning();
        const [event] = await tx
          .insert(auditEvents)
          .values({
            actorId: user.id,
            targetId: user.id,
            action: 'users.profile.updated',
            metadata: { fields: Object.keys(body) }
          })
          .returning();
        await tx.insert(outbox).values({ eventId: event!.id });
        return { user: updated };
      });
    },
    {
      body: t.Object(
        {
          firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
          lastName: t.Optional(t.String({ maxLength: 100 })),
          nickname: t.Optional(t.String({ maxLength: 100 })),
          bio: t.Optional(t.String({ maxLength: 5000 })),
          github: t.Optional(t.Union([t.Null(), t.String({ maxLength: 300 })])),
          linkedin: t.Optional(t.Union([t.Null(), t.String({ maxLength: 300 })])),
          publicPrivacy: t.Optional(
            t.Union([t.Literal('full-name'), t.Literal('last-initial'), t.Literal('initials')])
          )
        },
        { additionalProperties: false }
      )
    }
  )
  .delete('/me', async ({ user }) => {
    if (!user) throw status(401);
    return anonymizeUser(user.id, user.id);
  })
  .get('/me/sessions', async ({ user, db, request }) => {
    if (!user) throw status(401);
    const token = request.headers.get('x-ksi-session');
    let currentSessionId: string | null = null;
    if (token) {
      const [fs] = await db
        .select({ sessionId: frontendSessions.sessionId })
        .from(frontendSessions)
        .where(
          and(
            eq(frontendSessions.id, new Bun.CryptoHasher('sha256').update(token).digest('hex')),
            gt(frontendSessions.expiresAt, new Date())
          )
        );
      currentSessionId = fs?.sessionId ?? null;
    }
    const userSessions = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent
      })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.createdAt));

    return userSessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId
    }));
  })
  .delete(
    '/me/sessions/:id',
    async ({ user, db, params }) => {
      if (!user) throw status(401);
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, params.id), eq(sessions.userId, user.id)));
      if (!session) throw status(404, { message: 'Session not found' });
      await db.delete(sessions).where(eq(sessions.id, params.id));
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() })
    }
  )
  .get(
    '/',
    async ({ user, db, query }) => {
      requirePermission(user, 'users.membership.activate');
      const pattern = query.search ? `%${query.search.replace(/[\\%_]/g, '\\$&')}%` : undefined;
      const where = and(
        query.role ? eq(users.role, query.role) : undefined,
        query.status ? eq(users.membershipStatus, query.status) : undefined,
        pattern
          ? or(
              ilike(users.name, pattern),
              ilike(users.email, pattern),
              ilike(users.nickname, pattern)
            )
          : undefined
      );
      const [records, totals] = await Promise.all([
        db
          .select()
          .from(users)
          .where(where)
          .orderBy(asc(users.name), asc(users.id))
          .limit(50)
          .offset((query.page ?? 0) * 50),
        db.select({ total: count() }).from(users).where(where)
      ]);
      return { users: records, total: totals[0]!.total };
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 0, maximum: 100000, multipleOf: 1 })),
        search: t.Optional(t.String({ maxLength: 200 })),
        role: t.Optional(
          t.Union([t.Literal('member'), t.Literal('board'), t.Literal('administrator')])
        ),
        status: t.Optional(
          t.Union([
            t.Literal('pending'),
            t.Literal('active'),
            t.Literal('suspended'),
            t.Literal('deleted')
          ])
        )
      })
    }
  )
  .get('/:id', async ({ user, db, params }) => {
    requirePermission(user, 'users.membership.activate');
    const [member] = await db.select().from(users).where(eq(users.id, params.id));
    if (!member) throw status(404, { code: 'USER_NOT_FOUND' });
    return member;
  })
  .patch(
    '/:id/profile',
    async ({ user, db, params, body }) => {
      const actor = requirePermission(user, 'users.members.manage-profile');
      if (actor.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
      for (const provider of ['github', 'linkedin'] as const)
        if (!validProfileLink(provider, body[provider]))
          throw status(422, { code: `INVALID_${provider.toUpperCase()}_URL` });
      return db.transaction(async (tx) => {
        const [currentActor] = await tx
          .select()
          .from(users)
          .where(eq(users.id, actor.id))
          .for('share');
        requirePermission(currentActor ?? null, 'users.members.manage-profile');
        if (currentActor?.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
        const [member] = await tx.select().from(users).where(eq(users.id, params.id)).for('update');
        if (!member) throw status(404, { code: 'USER_NOT_FOUND' });
        if (member.membershipStatus === 'deleted') throw status(409, { code: 'ACCOUNT_DELETED' });
        const [updated] = await tx
          .update(users)
          .set({
            ...body,
            name:
              [body.firstName ?? member.firstName, body.lastName ?? member.lastName]
                .filter(Boolean)
                .join(' ') || member.name
          })
          .where(eq(users.id, params.id))
          .returning();
        const [event] = await tx
          .insert(auditEvents)
          .values({
            actorId: actor.id,
            targetId: params.id,
            action: 'users.profile.updated',
            metadata: { fields: Object.keys(body) }
          })
          .returning();
        await tx.insert(outbox).values({ eventId: event!.id });
        return updated;
      });
    },
    {
      body: t.Object(
        {
          firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
          lastName: t.Optional(t.String({ maxLength: 100 })),
          nickname: t.Optional(t.String({ maxLength: 100 })),
          bio: t.Optional(t.String({ maxLength: 5000 })),
          github: t.Optional(t.Union([t.Null(), t.String({ maxLength: 300 })])),
          linkedin: t.Optional(t.Union([t.Null(), t.String({ maxLength: 300 })]))
        },
        { additionalProperties: false }
      )
    }
  )

  .patch(
    '/:id/email',
    async ({ user, db, params, body }) => {
      const actor = requirePermission(user, 'users.accounts.edit-email');
      if (actor.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
      const email = body.email.trim().toLowerCase();
      const urls = getUrls();
      const context = await auth.$context;
      try {
        return await db.transaction(async (tx) => {
          const [currentActor] = await tx
            .select()
            .from(users)
            .where(eq(users.id, actor.id))
            .for('share');
          requirePermission(currentActor ?? null, 'users.accounts.edit-email');
          if (currentActor?.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
          const [member] = await tx
            .select()
            .from(users)
            .where(eq(users.id, params.id))
            .for('update');
          if (!member) throw status(404, { code: 'USER_NOT_FOUND' });
          if (member.membershipStatus === 'deleted') throw status(409, { code: 'ACCOUNT_DELETED' });
          if (member.email.toLowerCase() === email) return member;
          const [taken] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email));
          if (taken) throw status(409, { code: 'EMAIL_IN_USE' });
          const [updated] = await tx
            .update(users)
            .set({ email, emailVerified: false })
            .where(eq(users.id, params.id))
            .returning();
          await tx.delete(sessions).where(eq(sessions.userId, params.id));
          await tx
            .delete(verifications)
            .where(
              and(
                eq(verifications.value, params.id),
                ilike(verifications.identifier, 'reset-password:%')
              )
            );
          const token = await createEmailVerificationToken(context.secret, email);
          const url = `${urls.frontend.auth}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(urls.frontend.auth)}`;
          await tx
            .insert(mailJobs)
            .values({ to: email, subject: 'KSI: potwierdź adres / verify email', body: url });
          await recordEvent(tx, {
            actorId: actor.id,
            action: 'users.email.changed',
            targetId: params.id
          });
          return updated!;
        });
      } catch (error) {
        // A concurrent claim of the address must also produce a useful conflict response.
        if (
          (error as { code?: string }).code === '23505' ||
          (error as { cause?: { code?: string } }).cause?.code === '23505'
        )
          throw status(409, { code: 'EMAIL_IN_USE' });
        throw error;
      }
    },
    {
      body: t.Object(
        { email: t.String({ format: 'email', maxLength: 254 }) },
        { additionalProperties: false }
      )
    }
  )
  .post('/:id/password-reset', async ({ user, db, params }) => {
    const actor = requirePermission(user, 'users.accounts.reset-password');
    if (actor.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
    await db.transaction(async (tx) => {
      const [currentActor] = await tx
        .select()
        .from(users)
        .where(eq(users.id, actor.id))
        .for('share');
      requirePermission(currentActor ?? null, 'users.accounts.reset-password');
      if (currentActor?.role !== 'administrator') throw status(403, { code: 'FORBIDDEN' });
      const [member] = await tx.select().from(users).where(eq(users.id, params.id)).for('update');
      if (!member) throw status(404, { code: 'USER_NOT_FOUND' });
      if (member.membershipStatus === 'deleted') throw status(409, { code: 'ACCOUNT_DELETED' });
      await auth.api.requestPasswordReset({
        body: { email: member.email, redirectTo: `${getUrls().frontend.auth}/reset-password` }
      });
      await recordEvent(tx, {
        actorId: actor.id,
        action: 'users.password-reset.queued',
        targetId: params.id
      });
    });
    return { queued: true };
  })
  .patch(
    '/:id/access',
    async ({ user, params, body }) => {
      requirePermission(
        user,
        body.flags
          ? 'users.permissions.assign'
          : body.role
            ? 'users.roles.assign'
            : body.membershipStatus === 'active'
              ? 'users.membership.activate'
              : 'users.membership.suspend'
      );
      return manageUser(user!.id, params.id, body);
    },
    {
      body: t.Object(
        {
          role: t.Optional(
            t.Union([t.Literal('member'), t.Literal('board'), t.Literal('administrator')])
          ),
          membershipStatus: t.Optional(
            t.Union([t.Literal('pending'), t.Literal('active'), t.Literal('suspended')])
          ),
          flags: t.Optional(t.Array(t.String(), { maxItems: 100 }))
        },
        { additionalProperties: false }
      )
    }
  )
  .delete('/:id', async ({ user, params }) => {
    requirePermission(user, 'users.accounts.anonymize');
    return anonymizeUser(user!.id, params.id);
  });
