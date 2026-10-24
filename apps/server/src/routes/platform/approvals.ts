import { contentChanges } from 'shared/activity';
import { and, eq, desc, sql } from 'drizzle-orm';
import { status, t } from 'elysia';
import { avatarRequests, users, files } from '../../db';
import { createElysia, requirePermission } from '../../lib/createElysia';
import { effectivePermissions } from '../../domain/permissions';
import { canReviewAvatar, validAvatar } from '../../domain/avatar-review';
import { syncFileReferences } from './files';
import { storageEnvironment } from '../../lib/storage';
import { recordEvent } from '../../lib/audit';
import { manageUser } from '../../services/users';
export const approvalRoutes = createElysia({ prefix: '/users', protectedRoute: true })
  .get('/inbox', async ({ db, user }) => {
    if (!user || user.membershipStatus !== 'active' || user.role === 'member')
      throw status(403, { code: 'FORBIDDEN' });
    const permissions = effectivePermissions(user);
    if (!permissions.has('users.membership.activate') && !canReviewAvatar(user))
      throw status(403, { code: 'FORBIDDEN' });
    const memberships = permissions.has('users.membership.activate')
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt
          })
          .from(users)
          .where(and(eq(users.membershipStatus, 'pending'), eq(users.role, 'member')))
          .orderBy(desc(users.createdAt))
      : [];
    const avatars = canReviewAvatar(user)
      ? await db
          .select({
            userId: users.id,
            name: users.name,
            fileId: avatarRequests.fileId,
            version: avatarRequests.version,
            createdAt: avatarRequests.createdAt
          })
          .from(avatarRequests)
          .innerJoin(users, eq(users.id, avatarRequests.userId))
          .where(and(eq(avatarRequests.state, 'pending'), eq(users.membershipStatus, 'active')))
          .orderBy(desc(avatarRequests.createdAt))
      : [];
    return { memberships, avatars };
  })
  .post(
    '/inbox/members/:id',
    async ({ user, params, body }) => {
      const actor = requirePermission(
        user,
        body.approved ? 'users.membership.activate' : 'users.membership.suspend'
      );
      return manageUser(
        actor.id,
        params.id,
        { membershipStatus: body.approved ? 'active' : 'suspended' },
        'pending'
      );
    },
    { body: t.Object({ approved: t.Boolean() }) }
  )
  .get('/me/avatar-request', async ({ db, user }) => {
    const actor = requirePermission(user, 'users.profile.edit-avatar');
    const [request] = await db
      .select()
      .from(avatarRequests)
      .where(eq(avatarRequests.userId, actor.id));
    return request ?? null;
  })
  .post(
    '/me/avatar-request',
    async ({ db, user, body }) => {
      const actor = requirePermission(user, 'users.profile.edit-avatar');
      return db.transaction(async (tx) => {
        await tx.select().from(users).where(eq(users.id, actor.id)).for('update');
        const [file] = await tx.select().from(files).where(eq(files.id, body.fileId));
        if (
          !file ||
          file.uploaderId !== actor.id ||
          file.environment !== storageEnvironment() ||
          file.state !== 'private' ||
          !validAvatar(file.mime, file.size)
        )
          throw status(422, {
            code: 'INVALID_AVATAR',
            message: 'Choose a JPEG, PNG, WebP, AVIF or GIF image up to 5 MiB.'
          });
        const [previous] = await tx
          .select()
          .from(avatarRequests)
          .where(eq(avatarRequests.userId, actor.id))
          .for('update');
        const [request] = await tx
          .insert(avatarRequests)
          .values({ userId: actor.id, fileId: file.id })
          .onConflictDoUpdate({
            target: avatarRequests.userId,
            set: {
              fileId: file.id,
              state: 'pending',
              version: sql`${avatarRequests.version}+1`,
              createdAt: new Date(),
              reviewedAt: null,
              reviewedBy: null
            }
          })
          .returning();
        await syncFileReferences(tx, 'avatar-request', actor.id, `file:${file.id}`, actor);
        await recordEvent(tx, {
          actorId: actor.id,
          action: 'users.avatar.requested',
          targetId: actor.id,
          metadata: { changes: contentChanges(previous ?? {}, request!, ['fileId', 'state']) }
        });
        return request;
      });
    },
    { body: t.Object({ fileId: t.String({ minLength: 8, maxLength: 64 }) }) }
  )
  .delete('/me/avatar-request', async ({ db, user }) => {
    const actor = requirePermission(user, 'users.profile.edit-avatar');
    return db.transaction(async (tx) => {
      await tx.select().from(users).where(eq(users.id, actor.id)).for('update');
      const [request] = await tx
        .select()
        .from(avatarRequests)
        .where(eq(avatarRequests.userId, actor.id))
        .for('update');
      if (!request || request.state !== 'pending')
        throw status(409, { code: 'REQUEST_ALREADY_REVIEWED' });
      await tx
        .update(avatarRequests)
        .set({ state: 'withdrawn', fileId: null, version: sql`${avatarRequests.version}+1` })
        .where(eq(avatarRequests.userId, actor.id));
      await syncFileReferences(tx, 'avatar-request', actor.id, '', actor);
      await recordEvent(tx, {
        actorId: actor.id,
        action: 'users.avatar.withdrawn',
        targetId: actor.id,
        metadata: {
          changes: contentChanges(request, { state: 'withdrawn', fileId: null }, [
            'fileId',
            'state'
          ])
        }
      });
      return { ok: true };
    });
  })
  .post(
    '/inbox/avatars/:id',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'users.approvals.review-avatar');
      if (!canReviewAvatar(actor)) throw status(403, { code: 'FORBIDDEN' });
      return db.transaction(async (tx) => {
        const [target] = await tx.select().from(users).where(eq(users.id, params.id)).for('update');
        const [request] = await tx
          .select()
          .from(avatarRequests)
          .where(eq(avatarRequests.userId, params.id))
          .for('update');
        if (
          !target ||
          target.membershipStatus !== 'active' ||
          !request ||
          request.state !== 'pending' ||
          request.version !== body.version ||
          !request.fileId
        )
          throw status(409, { code: 'REQUEST_ALREADY_REVIEWED' });
        if (body.approved) {
          const [file] = await tx.select().from(files).where(eq(files.id, request.fileId));
          if (
            !file ||
            file.environment !== storageEnvironment() ||
            file.state === 'deleting' ||
            !validAvatar(file.mime, file.size)
          )
            throw status(422, { code: 'INVALID_AVATAR' });
          await tx
            .update(users)
            .set({ image: `/media/${file.id}` })
            .where(eq(users.id, target.id));
          await syncFileReferences(tx, 'profile', target.id, `file:${file.id}`, actor);
        }
        await tx
          .update(avatarRequests)
          .set({
            state: body.approved ? 'accepted' : 'declined',
            fileId: null,
            reviewedBy: actor.id,
            reviewedAt: new Date(),
            version: sql`${avatarRequests.version}+1`
          })
          .where(eq(avatarRequests.userId, target.id));
        await syncFileReferences(tx, 'avatar-request', target.id, '', actor);
        await recordEvent(tx, {
          actorId: actor.id,
          action: body.approved ? 'users.avatar.accepted' : 'users.avatar.declined',
          targetId: target.id,
          metadata: {
            changes: contentChanges(
              { ...request, image: target.image },
              {
                state: body.approved ? 'accepted' : 'declined',
                fileId: null,
                image: body.approved ? `/media/${request.fileId}` : target.image
              },
              ['state', 'fileId', 'image']
            )
          }
        });
        return { ok: true };
      });
    },
    { body: t.Object({ approved: t.Boolean(), version: t.Integer({ minimum: 1 }) }) }
  );
