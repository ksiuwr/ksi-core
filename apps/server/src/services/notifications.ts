import { mentionedUserIds } from 'shared/mentions';
import { and, eq, inArray, isNull, desc, sql } from 'drizzle-orm';
import { status } from 'elysia';
import { getUrls } from 'shared';
import {
  db,
  users,
  boards,
  projects,
  kanbanItems,
  threads,
  notifications,
  auditEvents,
  subscriptions,
  notificationPreferences,
  mailJobs
} from '../db';
import type { Executor, Transaction } from '../lib/audit';
import { scopeFor } from '../routes/platform/content';
import { canReadThread } from '../domain/permissions';

export type SubscriptionType = 'item' | 'thread';
export async function notificationTarget(executor: Executor, type: string, id: string) {
  let title: string, projectId: string | null;
  let thread: typeof threads.$inferSelect | undefined;
  if (type === 'item') {
    const [item] = await executor.select().from(kanbanItems).where(eq(kanbanItems.id, id));
    if (!item || item.deletedAt) return null;
    const [board] = await executor.select().from(boards).where(eq(boards.id, item.boardId));
    if (!board) return null;
    title = item.title;
    projectId = board.projectId;
  } else if (type === 'thread') {
    [thread] = await executor.select().from(threads).where(eq(threads.id, id));
    if (!thread) return null;
    title = thread.title;
    projectId = thread.projectId;
  } else return null;
  const scope = await scopeFor(executor, projectId);
  const [project] = projectId
    ? await executor.select().from(projects).where(eq(projects.id, projectId))
    : [];
  const base = project ? `/projects/${encodeURIComponent(project.slug)}` : '/association';
  const href =
    type === 'item'
      ? `${base}/kanban?item=${encodeURIComponent(id)}`
      : `${base}/forum/${encodeURIComponent(id)}`;
  return {
    title,
    href,
    projectId,
    projectName: project?.name ?? null,
    canRead: (user: typeof users.$inferSelect) =>
      user.membershipStatus === 'active' &&
      (!thread ||
        canReadThread(
          user,
          scope,
          thread.visibility as 'association' | 'members' | 'leaders',
          thread.invitedIds
        ))
  };
}
export async function requireNotificationTarget(
  executor: Executor,
  type: string,
  id: string,
  user: typeof users.$inferSelect
) {
  const target = await notificationTarget(executor, type, id);
  if (!target || !target.canRead(user)) throw status(404, { code: 'TARGET_NOT_FOUND' });
  return target;
}
export async function subscribe(
  executor: Executor,
  type: SubscriptionType,
  id: string,
  userId: string
) {
  await executor
    .insert(subscriptions)
    .values({ ownerType: type, ownerId: id, userId })
    .onConflictDoNothing();
}
export async function notifyCollaboration(
  tx: Transaction,
  eventId: string,
  type: SubscriptionType,
  id: string,
  actorId: string,
  options: { markdown?: string; assigneeIds?: string[]; watch?: boolean } = {}
) {
  const target = await notificationTarget(tx, type, id);
  if (!target) return;
  const watchers =
    options.watch === false
      ? []
      : await tx
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.ownerType, type), eq(subscriptions.ownerId, id)));
  const recipients = new Map(watchers.map((watcher) => [watcher.userId, 'update']));
  for (const userId of options.assigneeIds ?? []) recipients.set(userId, 'assignment');
  for (const userId of mentionedUserIds(options.markdown ?? '')) recipients.set(userId, 'mention');
  recipients.delete(actorId);
  if (!recipients.size) return;
  const candidates = await tx
    .select()
    .from(users)
    .where(inArray(users.id, [...recipients.keys()]));
  const values = candidates.filter(target.canRead).map((user) => ({
    userId: user.id,
    eventId,
    ownerType: type,
    ownerId: id,
    reason: recipients.get(user.id)!
  }));
  if (values.length) await tx.insert(notifications).values(values).onConflictDoNothing();
}
export async function listNotifications(
  executor: Executor,
  user: typeof users.$inferSelect,
  limit = 100
) {
  const rows = await executor
    .select({
      notification: notifications,
      action: auditEvents.action,
      actorName: users.name,
      metadata: auditEvents.metadata
    })
    .from(notifications)
    .innerJoin(auditEvents, eq(notifications.eventId, auditEvents.id))
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const visible = [];
  for (const { notification, action, actorName, metadata } of rows) {
    const target = await notificationTarget(executor, notification.ownerType, notification.ownerId);
    if (target?.canRead(user)) {
      const changedFields = Array.isArray(metadata.changes)
        ? metadata.changes.flatMap((change) =>
            change && typeof change.field === 'string' ? [change.field] : []
          )
        : [];
      visible.push({
        ...notification,
        title: target.title,
        href: target.href,
        projectName: target.projectName,
        actorName,
        action,
        changedFields
      });
    }
  }
  return visible;
}
/** Queue only unread notifications after the user's configured delay. Row locks prevent duplicate jobs. */
export async function queueNotificationMailBatch(limit = 100) {
  return db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(notifications)
      .where(
        and(
          isNull(notifications.readAt),
          isNull(notifications.emailQueuedAt),
          sql`exists (select 1 from ${notificationPreferences} p where p.user_id = ${notifications.userId} and p.email_enabled = true and ${notifications.createdAt} <= now() - p.email_delay_minutes * interval '1 minute')`
        )
      )
      .orderBy(notifications.createdAt)
      .limit(limit)
      .for('update', { skipLocked: true });
    let queued = 0;
    for (const row of pending) {
      const [user] = await tx.select().from(users).where(eq(users.id, row.userId));
      const target = await notificationTarget(tx, row.ownerType, row.ownerId);
      if (user?.emailVerified && target?.canRead(user)) {
        await tx.insert(mailJobs).values({
          to: user.email,
          subject: `KSI: ${target.title}`,
          body: `${row.reason}: ${target.title}\n${getUrls().frontend.dashboard}${target.href}`
        });
        queued++;
      }
      await tx
        .update(notifications)
        .set({ emailQueuedAt: new Date() })
        .where(eq(notifications.id, row.id));
    }
    return queued;
  });
}
