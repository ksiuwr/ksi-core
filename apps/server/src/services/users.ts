import { and, eq, sql } from 'drizzle-orm';
import { contentChanges, accessChangeFields } from 'shared/activity';
import { recordEvent } from '../lib/audit';
import { createId } from '@paralleldrive/cuid2';
import {
  db,
  avatarRequests,
  users,
  sessions,
  accounts,
  verifications,
  projectMembers,
  fileReferences
} from '../db';
import { anonymousAlias } from '../domain/profiles';
import {
  effectivePermissions,
  validateFlags,
  type MembershipStatus,
  type Role
} from '../domain/permissions';
export async function manageUser(
  actorId: string,
  userId: string,
  change: { role?: Role; membershipStatus?: MembershipStatus; flags?: string[] },
  expectedStatus?: MembershipStatus
) {
  if (change.flags) validateFlags(change.flags);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(842501)`);
    const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!actor || !target || actor.membershipStatus !== 'active') throw new Error('FORBIDDEN');
    if (expectedStatus && target.membershipStatus !== expectedStatus)
      throw new Error('REQUEST_ALREADY_REVIEWED');
    if (
      actor.role !== 'administrator' &&
      !(
        actor.role === 'board' &&
        target.role === 'member' &&
        target.membershipStatus === 'pending' &&
        change.membershipStatus === 'active' &&
        change.role === undefined &&
        change.flags === undefined
      )
    )
      throw new Error('FORBIDDEN');
    const granted = effectivePermissions(actor);
    if (change.role && !granted.has('users.roles.assign')) throw new Error('FORBIDDEN');
    if (change.flags && !granted.has('users.permissions.assign')) throw new Error('FORBIDDEN');
    if (
      change.membershipStatus &&
      !granted.has(
        change.membershipStatus === 'active'
          ? 'users.membership.activate'
          : 'users.membership.suspend'
      )
    )
      throw new Error('FORBIDDEN');
    if (target.membershipStatus === 'deleted') throw new Error('ACCOUNT_DELETED');
    if (change.membershipStatus && change.membershipStatus !== 'active') {
      const led = await tx
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.userId, userId), eq(projectMembers.leader, true)));
      for (const membership of led) {
        const leaders = await tx
          .select({ id: users.id })
          .from(projectMembers)
          .innerJoin(users, eq(projectMembers.userId, users.id))
          .where(
            and(
              eq(projectMembers.projectId, membership.projectId),
              eq(projectMembers.leader, true),
              eq(users.membershipStatus, 'active')
            )
          );
        if (leaders.filter((l) => l.id !== userId).length === 0)
          throw new Error('ACTIVE_LEADER_REQUIRED');
      }
    }
    if (change.membershipStatus === 'deleted') throw new Error('USE_ANONYMIZATION');
    if (
      target.role === 'administrator' &&
      target.membershipStatus === 'active' &&
      ((change.role && change.role !== 'administrator') ||
        (change.membershipStatus && change.membershipStatus !== 'active'))
    ) {
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'administrator'), eq(users.membershipStatus, 'active')));
      if (admins.length <= 1) throw new Error('LAST_ADMINISTRATOR');
    }
    const [updated] = await tx.update(users).set(change).where(eq(users.id, userId)).returning();
    if (change.membershipStatus && change.membershipStatus !== 'active')
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    await recordEvent(tx, {
      actorId,
      targetId: userId,
      action: 'users.membership.changed',
      metadata: { changes: contentChanges(target, updated!, accessChangeFields) }
    });
    return updated;
  });
}
export async function anonymizeUser(actorId: string, userId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(842501)`);
    const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (
      !actor ||
      !target ||
      (actorId !== userId &&
        !(actor.role === 'administrator' && actor.membershipStatus === 'active'))
    )
      throw new Error('FORBIDDEN');
    if (target.membershipStatus === 'deleted') return { success: true };
    const admins = await tx
      .select()
      .from(users)
      .where(and(eq(users.role, 'administrator'), eq(users.membershipStatus, 'active')));
    if (
      target.role === 'administrator' &&
      target.membershipStatus === 'active' &&
      admins.length <= 1
    )
      throw new Error('LAST_ADMINISTRATOR');
    const led = await tx
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, userId), eq(projectMembers.leader, true)));
    for (const membership of led) {
      const remaining = await tx
        .select()
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(
          and(
            eq(projectMembers.projectId, membership.projectId),
            eq(projectMembers.leader, true),
            eq(users.membershipStatus, 'active')
          )
        );
      if (remaining.filter((row) => row.users.id !== userId).length === 0) {
        const replacement = admins.find((a) => a.id !== userId);
        if (!replacement) throw new Error('LEADER_REASSIGNMENT_REQUIRED');
        await tx
          .insert(projectMembers)
          .values({ projectId: membership.projectId, userId: replacement.id, leader: true })
          .onConflictDoUpdate({
            target: [projectMembers.projectId, projectMembers.userId],
            set: { leader: true }
          });
      }
    }
    const alias = anonymousAlias(createId());
    const oldReferences = await tx
      .select()
      .from(fileReferences)
      .where(and(eq(fileReferences.ownerType, 'profile'), eq(fileReferences.ownerId, userId)));
    if (oldReferences.length) {
      const { files } = await import('../db');
      for (const reference of oldReferences)
        await tx.select().from(files).where(eq(files.id, reference.fileId)).for('update');
    }
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(verifications).where(eq(verifications.identifier, target.email));
    await tx.delete(projectMembers).where(eq(projectMembers.userId, userId));
    const { syncFileReferences } = await import('../routes/platform/files');
    await tx
      .update(avatarRequests)
      .set({ state: 'withdrawn', fileId: null })
      .where(eq(avatarRequests.userId, userId));
    await syncFileReferences(tx, 'avatar-request', userId, '', target);
    await tx.update(users).set({ image: null }).where(eq(users.id, userId));
    await syncFileReferences(tx, 'profile', userId, '', target);
    await tx
      .update(users)
      .set({
        name: alias,
        firstName: alias,
        lastName: '',
        nickname: null,
        email: `${createId()}@deleted.invalid`,
        emailVerified: false,
        image: null,
        bio: null,
        translations: {},
        github: null,
        linkedin: null,
        flags: [],
        role: 'member',
        membershipStatus: 'deleted',
        deletedAt: new Date()
      })
      .where(eq(users.id, userId));
    await recordEvent(tx, {
      actorId,
      targetId: userId,
      action: 'users.account.anonymized',
      metadata: {
        changes: contentChanges(
          target,
          { role: 'member', membershipStatus: 'deleted', flags: [] },
          accessChangeFields
        )
      }
    });
    return { success: true };
  });
}
