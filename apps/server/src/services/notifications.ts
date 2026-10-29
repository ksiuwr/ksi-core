import { assignmentChanges } from 'shared/notifications';
import { mentionedUserIds } from 'shared/mentions';
import { and, eq, inArray, isNull, desc, sql } from 'drizzle-orm';
import { status } from 'elysia';
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
import { notificationMail } from '../lib/mail';
import { scopeFor } from '../routes/platform/content';
import { canReadThread } from '../domain/permissions';

export type SubscriptionType = 'item' | 'thread';
export async function notificationTarget(executor: Executor, type: string, id: string) {
  let title: string, projectId: string | null, referenceNumber: number | null;
  let thread: typeof threads.$inferSelect | undefined;
  if (type === 'item') {
    const [item] = await executor.select().from(kanbanItems).where(eq(kanbanItems.id, id));
    if (!item || item.deletedAt) return null;
    const [board] = await executor.select().from(boards).where(eq(boards.id, item.boardId));
    if (!board) return null;
    title = item.title;
    projectId = board.projectId;
    referenceNumber = item.referenceNumber;
  } else if (type === 'thread') {
    [thread] = await executor.select().from(threads).where(eq(threads.id, id));
    if (!thread) return null;
    title = thread.title;
    projectId = thread.projectId;
    referenceNumber = thread.referenceNumber;
  } else return null;
  const scope = await scopeFor(executor, projectId);
  const [project] = projectId
    ? await executor.select().from(projects).where(eq(projects.id, projectId))
    : [];
  const base = project ? `/projects/${encodeURIComponent(project.slug)}` : '/association';
  const reference = referenceNumber ?? encodeURIComponent(id);
  const href = type === 'item' ? `${base}/tasks/${reference}` : `${base}/forum/${reference}`;
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
  actorId: string | null,
  options: { markdown?: string; assigneeIds?: string[]; watch?: boolean; reason?: string } = {}
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
  if (actorId) recipients.delete(actorId);
  const candidateIds = [...new Set([...recipients.keys(), ...(options.assigneeIds ?? [])])];
  if (!candidateIds.length) return;
  const candidates = await tx.select().from(users).where(inArray(users.id, candidateIds));
  const readable = candidates.filter(target.canRead);
  for (const user of readable) {
    if (options.assigneeIds?.includes(user.id)) await subscribe(tx, type, id, user.id);
  }
  const values = readable
    .filter((user) => recipients.has(user.id))
    .map((user) => ({
      userId: user.id,
      eventId,
      ownerType: type,
      ownerId: id,
      reason: options.reason ?? recipients.get(user.id)!
    }));
  if (values.length) await tx.insert(notifications).values(values).onConflictDoNothing();
}
type NotificationEvent = {
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
};
const notificationEvent = {
  action: auditEvents.action,
  actorName: users.name,
  metadata: auditEvents.metadata
};
/** Resolve assignee names for a batch of events with a single lookup. */
async function assigneeNames(executor: Executor, events: Pick<NotificationEvent, 'metadata'>[]) {
  const assigneeIds = [
    ...new Set(
      events.flatMap(({ metadata }) => {
        const { added, removed } = assignmentChanges(metadata.changes);
        return [...added, ...removed];
      })
    )
  ];
  const assignees = assigneeIds.length
    ? await executor
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, assigneeIds))
    : [];
  return new Map(assignees.map((user) => [user.id, user.name]));
}
function eventContext(
  { action, actorName, metadata }: NotificationEvent,
  names: Map<string, string>
) {
  const changedFields = Array.isArray(metadata.changes)
    ? metadata.changes.flatMap((change) =>
        change && typeof change.field === 'string' ? [change.field] : []
      )
    : [];
  const assignments = assignmentChanges(metadata.changes);
  return {
    actorName,
    action,
    changedFields,
    assignedNames: assignments.added.map((id) => names.get(id) ?? null),
    unassignedNames: assignments.removed.map((id) => names.get(id) ?? null)
  };
}
export async function listNotifications(
  executor: Executor,
  user: typeof users.$inferSelect,
  limit = 100
) {
  const rows = await executor
    .select({ notification: notifications, ...notificationEvent })
    .from(notifications)
    .innerJoin(auditEvents, eq(notifications.eventId, auditEvents.id))
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const names = await assigneeNames(executor, rows);
  const visible = [];
  for (const { notification, ...event } of rows) {
    const target = await notificationTarget(executor, notification.ownerType, notification.ownerId);
    if (target?.canRead(user)) {
      visible.push({
        ...notification,
        title: target.title,
        href: target.href,
        projectName: target.projectName,
        ...eventContext(event, names)
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
        const [event] = await tx
          .select(notificationEvent)
          .from(auditEvents)
          .leftJoin(users, eq(auditEvents.actorId, users.id))
          .where(eq(auditEvents.id, row.eventId));
        await tx.insert(mailJobs).values({
          to: user.email,
          ...notificationMail({
            ...eventContext(event!, await assigneeNames(tx, [event!])),
            ownerType: row.ownerType,
            projectName: target.projectName,
            reason: row.reason,
            title: target.title,
            href: target.href,
            dueAt: typeof event!.metadata.dueAt === 'string' ? event!.metadata.dueAt : null
          })
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
