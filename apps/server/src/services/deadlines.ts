import { and, eq, isNull, ne, lte, sql } from 'drizzle-orm';
import { db, kanbanItems, boards, deadlineReminders } from '../db';
import { recordEvent } from '../lib/audit';
import { notifyCollaboration } from './notifications';
import { reminderInterval } from '../domain/deadlines';

export async function queueDeadlineReminders(now = new Date(), limit = 100) {
  return db.transaction(async (tx) => {
    const interval = sql`case when ${kanbanItems.dueAt} > ${now}::timestamp + interval '3 days' then 7 when ${kanbanItems.dueAt} > ${now}::timestamp + interval '1 day' then 3 when ${kanbanItems.dueAt} > ${now}::timestamp then 1 else 0 end`;
    const items = await tx
      .select()
      .from(kanbanItems)
      .where(
        and(
          isNull(kanbanItems.deletedAt),
          ne(kanbanItems.column, 'done'),
          lte(kanbanItems.dueAt, new Date(now.getTime() + 7 * 86400000)),
          sql`not exists (select 1 from ${deadlineReminders} r where r.item_id = ${kanbanItems.id} and r.due_at = ${kanbanItems.dueAt} and r.days = ${interval})`
        )
      )
      .orderBy(kanbanItems.dueAt)
      .limit(limit)
      .for('update', { skipLocked: true });
    for (const item of items) {
      const days = reminderInterval(item.dueAt!, now)!;
      const [reminder] = await tx
        .insert(deadlineReminders)
        .values({ itemId: item.id, dueAt: item.dueAt!, days })
        .onConflictDoNothing()
        .returning();
      if (!reminder) continue;
      const [board] = await tx.select().from(boards).where(eq(boards.id, item.boardId));
      const event = await recordEvent(tx, {
        actorId: null,
        projectId: board!.projectId,
        action: 'kanban.deadline.reminder',
        targetId: item.id,
        metadata: { itemId: item.id, dueAt: item.dueAt!.toISOString(), days }
      });
      await notifyCollaboration(tx, event.id, 'item', item.id, null, {
        assigneeIds: item.assigneeIds.length ? item.assigneeIds : [item.authorId],
        watch: false,
        reason: 'deadline'
      });
    }
    return items.length;
  });
}
