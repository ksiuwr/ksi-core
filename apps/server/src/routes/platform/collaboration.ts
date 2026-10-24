import {
  contentChanges,
  taskChangeFields,
  hasContentChange,
  type ContentChange
} from 'shared/activity';
import { notifyCollaboration, subscribe } from '../../services/notifications';
import { and, eq, desc, exists, inArray, isNull, isNotNull, sql, or, type SQL } from 'drizzle-orm';
import { status, t } from 'elysia';
import { syncFileReferences } from './files';
import { createElysia, requirePermission } from '../../lib/createElysia';
import { recordEvent, type Executor, type Transaction } from '../../lib/audit';
import { boards, kanbanItems, threads, comments, users, auditEvents, projects } from '../../db';
import { canContribute, canReadThread } from '../../domain/permissions';
import { validBoardStatuses, statusExists, type BoardStatus } from '../../domain/board-statuses';
import { validBoardLabels, normalizeBoardLabel } from '../../domain/board-labels';
import { validLabels } from '../../domain/content-policy';
import { active, scopeFor, requireLeader } from './content';

const title = t.String({ minLength: 1, maxLength: 200 });
const internalMarkdownPattern = '^(?![\\s\\S]*:::gallery)[\\s\\S]*$';
const markdown = t.String({ minLength: 1, maxLength: 500000, pattern: internalMarkdownPattern });
const labels = t.Array(t.String({ minLength: 1, maxLength: 50 }), {
  maxItems: 30,
  uniqueItems: true
});
const boardLabel = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
  color: t.Optional(t.String({ pattern: '^#[0-9a-fA-F]{6}$' })),
  description: t.Optional(t.String({ maxLength: 200 }))
});
const boardLabelInput = t.Union([t.String({ minLength: 1, maxLength: 50 }), boardLabel]);
const visibility = t.Union([t.Literal('association'), t.Literal('members'), t.Literal('leaders')]);
const scopeKey = (projectId: string | null) => (projectId ? `project:${projectId}` : 'association');
async function boardScope(executor: Executor, id: string) {
  const [board] = await executor.select().from(boards).where(eq(boards.id, id));
  if (!board) throw status(404, { code: 'BOARD_NOT_FOUND' });
  return { board, scope: await scopeFor(executor, board.projectId) };
}
// Label definition edits affect every task using that label, including tasks in the graveyard.
async function recordTaskLabelChanges(
  tx: Transaction,
  board: typeof boards.$inferSelect,
  actorId: string,
  replacements: {
    before: ReturnType<typeof normalizeBoardLabel>;
    after: ReturnType<typeof normalizeBoardLabel>;
  }[]
) {
  for (const { before, after } of replacements) {
    const changes = contentChanges({ label: before }, { label: after }, ['label']);
    if (!changes.length) continue;
    const affected = await tx
      .select({ id: kanbanItems.id })
      .from(kanbanItems)
      .where(
        and(eq(kanbanItems.boardId, board.id), sql`${after.name} = ANY(${kanbanItems.labels})`)
      );
    for (const item of affected)
      await recordEvent(tx, {
        actorId,
        projectId: board.projectId,
        action: 'kanban.label.updated',
        targetId: item.id,
        metadata: { boardId: board.id, itemId: item.id, changes }
      });
  }
}
async function persistStatuses(
  tx: Transaction,
  board: typeof boards.$inferSelect,
  statuses: BoardStatus[],
  actorId: string
) {
  if (!validBoardStatuses(statuses)) throw status(422, { code: 'INVALID_BOARD_STATUSES' });
  const items = await tx
    .select({ column: kanbanItems.column, deletedAt: kanbanItems.deletedAt })
    .from(kanbanItems)
    .where(eq(kanbanItems.boardId, board.id));
  if (items.some((item) => !item.deletedAt && !statusExists(statuses, item.column)))
    throw status(409, { code: 'STATUS_HAS_LIVE_ITEMS' });
  if (items.some((item) => !statuses.some((s) => s.id === item.column)))
    throw status(409, { code: 'STATUS_IN_USE' });
  const [updated] = await tx
    .update(boards)
    .set({ statuses })
    .where(eq(boards.id, board.id))
    .returning();
  await recordEvent(tx, {
    actorId,
    projectId: board.projectId,
    action: 'boards.statuses.updated',
    targetId: board.id,
    metadata: { changes: contentChanges(board, updated!, ['statuses']) }
  });
  return updated;
}
async function threadScope(executor: Executor, id: string) {
  const [thread] = await executor.select().from(threads).where(eq(threads.id, id));
  if (!thread) throw status(404, { code: 'THREAD_NOT_FOUND' });
  return { thread, scope: await scopeFor(executor, thread.projectId) };
}
async function itemScope(executor: Executor, id: string) {
  const [item] = await executor.select().from(kanbanItems).where(eq(kanbanItems.id, id));
  if (!item) throw status(404, { code: 'ITEM_NOT_FOUND' });
  return { item, ...(await boardScope(executor, item.boardId)) };
}
function assertContribute(
  actor: typeof users.$inferSelect,
  scope: Awaited<ReturnType<typeof scopeFor>>
) {
  if (!canContribute(actor, scope)) throw status(403, { code: 'FORBIDDEN' });
}
function assertThreadRead(
  actor: typeof users.$inferSelect,
  thread: typeof threads.$inferSelect,
  scope: Awaited<ReturnType<typeof scopeFor>>
) {
  if (
    !canReadThread(
      actor,
      scope,
      thread.visibility as 'association' | 'members' | 'leaders',
      thread.invitedIds
    )
  )
    throw status(404, { code: 'THREAD_NOT_FOUND' });
}
async function validateInvitations(
  executor: Executor,
  ids: string[],
  scope: Awaited<ReturnType<typeof scopeFor>>
) {
  if (!ids.length) return;
  const candidates = await executor
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.membershipStatus, 'active')));
  if (
    candidates.length !== ids.length ||
    (!scope.association && ids.some((id) => !scope.memberIds.includes(id)))
  )
    throw status(422, { code: 'INVALID_INVITATION' });
}

const revisionQuery = {
  query: t.Object({ page: t.Optional(t.Numeric({ minimum: 0, maximum: 100000, multipleOf: 1 })) })
};

const itemRevisionFields = [
  'title',
  'markdown',
  'labels',
  'assigneeIds',
  'column',
  'label'
] as const;
function itemHistoryCondition(id: string, includeLifecycle = false) {
  return or(
    and(
      eq(auditEvents.targetId, id),
      inArray(auditEvents.action, [
        'kanban.created',
        'kanban.updated',
        'kanban.label.updated',
        ...(includeLifecycle ? ['kanban.tombstoned', 'kanban.restored'] : [])
      ])
    ),
    and(eq(auditEvents.action, 'kanban.reordered'), sql`${auditEvents.metadata}->>'itemId' = ${id}`)
  )!;
}
const threadRevisionFields = [
  'title',
  'markdown',
  'visibility',
  'invitedIds',
  'assigneeIds',
  'archivedAt'
] as const;
function threadHistoryCondition(executor: Executor, id: string) {
  const commentInThread = exists(
    executor
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.threadId, id), eq(comments.id, auditEvents.targetId)))
  );
  return or(
    and(
      eq(auditEvents.targetId, id),
      inArray(auditEvents.action, [
        'threads.created',
        'threads.access.updated',
        'threads.assignees.updated',
        'threads.archived',
        'threads.restored'
      ])
    ),
    and(eq(auditEvents.action, 'comments.removed'), commentInThread)
  )!;
}
async function editedCommentIds(executor: Executor, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await executor
    .select({ targetId: auditEvents.targetId })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, 'comments.edited'), inArray(auditEvents.targetId, ids)));
  return new Set(rows.map((row) => row.targetId));
}
function historyChanges(metadata: Record<string, unknown>, fields: readonly string[]) {
  return Array.isArray(metadata.changes)
    ? metadata.changes
        .filter(
          (change: ContentChange) =>
            change && fields.includes(change.field) && hasContentChange(change.before, change.after)
        )
        .map((change: ContentChange) => ({
          field: change.field,
          before: change.before,
          after: change.after
        }))
    : null;
}
// Both reader-facing histories use the same ordering, pagination and field filtering.
async function historyRecords(executor: Executor, condition: SQL, page: number) {
  const records = await executor
    .select({
      id: auditEvents.id,
      createdAt: auditEvents.createdAt,
      action: auditEvents.action,
      metadata: auditEvents.metadata,
      targetId: auditEvents.targetId,
      authorName: users.name,
      authorId: auditEvents.actorId
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .where(condition)
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
    .limit(21)
    .offset(page * 20);
  return records;
}
// Content readers can inspect revisions without gaining access to the administrative audit log.
async function contentRevisions(
  executor: Executor,
  condition: SQL,
  fields: readonly string[],
  page = 0
) {
  const records = await historyRecords(executor, condition, page);
  return {
    revisions: records.slice(0, 20).map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      authorName: record.authorName,
      kind: record.action.endsWith('.created')
        ? 'created'
        : record.action === 'kanban.reordered'
          ? 'moved'
          : 'edited',
      changes: historyChanges(record.metadata, fields)
    })),
    nextPage: records.length > 20 ? page + 1 : null
  };
}
const dueDate = t.Union([t.Null(), t.String({ format: 'date-time' })]);
const assigneeIds = t.Array(t.String(), { maxItems: 50, uniqueItems: true });
async function validateAssignees(
  executor: Executor,
  ids: string[],
  scope: Awaited<ReturnType<typeof scopeFor>>
) {
  if (!ids.length) return;
  const members = await executor
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.membershipStatus, 'active')));
  if (
    members.length !== ids.length ||
    (!scope.association && ids.some((id) => !scope.memberIds.includes(id)))
  )
    throw status(422, { code: 'INVALID_ASSIGNEE' });
}

export default createElysia({ prefix: '/platform' })
  .get(
    '/boards',
    async ({ db, user, query }) => {
      active(user);
      await scopeFor(db, query.projectId ?? null);
      const [board] = await db
        .select()
        .from(boards)
        .where(eq(boards.scopeKey, scopeKey(query.projectId ?? null)));
      if (!board) throw status(404, { code: 'BOARD_NOT_FOUND' });
      return board;
    },
    { query: t.Object({ projectId: t.Optional(t.String()) }) }
  )
  .post(
    '/boards',
    async ({ db, user, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        assertContribute(actor, await scopeFor(tx, body.projectId ?? null));
        const [created] = await tx
          .insert(boards)
          .values({ projectId: body.projectId ?? null, scopeKey: scopeKey(body.projectId ?? null) })
          .onConflictDoNothing()
          .returning();
        if (created) {
          await recordEvent(tx, {
            actorId: actor.id,
            projectId: created.projectId,
            action: 'boards.created',
            targetId: created.id,
            metadata: { changes: contentChanges({}, created, ['statuses', 'labels']) }
          });
          return created;
        }
        const [existing] = await tx
          .select()
          .from(boards)
          .where(eq(boards.scopeKey, scopeKey(body.projectId ?? null)));
        return existing;
      });
    },
    { body: t.Object({ projectId: t.Optional(t.String()) }) }
  )
  .put(
    '/boards/:id/labels',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [current] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!current) throw status(404, { code: 'BOARD_NOT_FOUND' });
        const items = await tx
          .select({ labels: kanbanItems.labels })
          .from(kanbanItems)
          .where(eq(kanbanItems.boardId, board.id));
        const normalized = body.labels.map(normalizeBoardLabel);
        if (!validBoardLabels(normalized)) throw status(422, { code: 'INVALID_BOARD_LABELS' });
        if (items.some((item) => !validLabels(item.labels, normalized)))
          throw status(409, { code: 'LABEL_IN_USE' });
        const [updated] = await tx
          .update(boards)
          .set({ labels: normalized })
          .where(eq(boards.id, board.id))
          .returning();
        await recordTaskLabelChanges(
          tx,
          board,
          actor.id,
          current.labels.flatMap((label) => {
            const after = normalized.find((candidate) => candidate.name === label.name);
            return after ? [{ before: normalizeBoardLabel(label), after }] : [];
          })
        );
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'boards.labels.updated',
          targetId: board.id,
          metadata: { changes: contentChanges(current, updated!, ['labels']) }
        });
        return updated;
      });
    },
    { body: t.Object({ labels: t.Array(boardLabelInput, { maxItems: 50 }) }) }
  )
  .post(
    '/boards/:id/labels',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [current] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!current) throw status(404, { code: 'BOARD_NOT_FOUND' });
        const currentLabels = current.labels.map(normalizeBoardLabel);
        const newLabel = normalizeBoardLabel(body);
        if (currentLabels.some((t) => t.name.toLowerCase() === newLabel.name.toLowerCase())) {
          throw status(409, { code: 'LABEL_ALREADY_EXISTS' });
        }
        const updatedLabels = [...currentLabels, newLabel];
        if (!validBoardLabels(updatedLabels)) throw status(422, { code: 'INVALID_BOARD_LABELS' });
        const [updated] = await tx
          .update(boards)
          .set({ labels: updatedLabels })
          .where(eq(boards.id, board.id))
          .returning();
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'boards.labels.updated',
          targetId: board.id,
          metadata: { changes: contentChanges(current, updated!, ['labels']) }
        });
        return updated;
      });
    },
    { body: boardLabel }
  )
  .patch(
    '/boards/:id/labels/:name',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [current] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!current) throw status(404, { code: 'BOARD_NOT_FOUND' });
        if (!current.labels.some((label) => label.name === params.name))
          throw status(404, { code: 'LABEL_NOT_FOUND' });
        const replacement = normalizeBoardLabel(body);
        const updatedLabels = current.labels.map((label) =>
          label.name === params.name ? replacement : label
        );
        if (!validBoardLabels(updatedLabels)) throw status(422, { code: 'INVALID_BOARD_LABELS' });
        if (replacement.name !== params.name) {
          // Include deleted tasks so restoring them preserves valid associations.
          // The board lock serializes this update with task creation and editing.
          await tx
            .update(kanbanItems)
            .set({
              labels: sql`array_replace(${kanbanItems.labels}, ${params.name}, ${replacement.name})`,
              version: sql`${kanbanItems.version} + 1`
            })
            .where(
              and(
                eq(kanbanItems.boardId, board.id),
                sql`${params.name} = ANY(${kanbanItems.labels})`
              )
            );
        }
        const [updated] = await tx
          .update(boards)
          .set({ labels: updatedLabels })
          .where(eq(boards.id, board.id))
          .returning();
        await recordTaskLabelChanges(tx, board, actor.id, [
          {
            before: normalizeBoardLabel(
              current.labels.find((label) => label.name === params.name)!
            ),
            after: replacement
          }
        ]);
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'boards.labels.updated',
          targetId: board.id,
          metadata: { changes: contentChanges(current, updated!, ['labels']) }
        });
        return updated;
      });
    },
    { body: boardLabel }
  )
  .delete('/boards/:id/labels/:name', async ({ db, user, params }) => {
    const actor = active(user);
    return db.transaction(async (tx) => {
      const { board, scope } = await boardScope(tx, params.id);
      requireLeader(actor, scope, 'projects.catalog.edit');
      const [current] = await tx.select().from(boards).where(eq(boards.id, board.id)).for('update');
      if (!current) throw status(404, { code: 'BOARD_NOT_FOUND' });
      const targetName = params.name;
      if (!current.labels.some((label) => label.name === targetName))
        throw status(404, { code: 'LABEL_NOT_FOUND' });
      const items = await tx
        .select({ labels: kanbanItems.labels })
        .from(kanbanItems)
        .where(eq(kanbanItems.boardId, board.id));
      if (
        items.some((item) => item.labels.some((t) => t.toLowerCase() === targetName.toLowerCase()))
      ) {
        throw status(409, { code: 'LABEL_IN_USE' });
      }
      const updatedLabels = current.labels
        .map(normalizeBoardLabel)
        .filter((t) => t.name.toLowerCase() !== targetName.toLowerCase());
      const [updated] = await tx
        .update(boards)
        .set({ labels: updatedLabels })
        .where(eq(boards.id, board.id))
        .returning();
      await recordEvent(tx, {
        actorId: actor.id,
        projectId: board.projectId,
        action: 'boards.labels.updated',
        targetId: board.id,
        metadata: { changes: contentChanges(current, updated!, ['labels']) }
      });
      return updated;
    });
  })
  .put(
    '/boards/:id/statuses',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [current] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!current) throw status(404, { code: 'BOARD_NOT_FOUND' });
        return persistStatuses(tx, current, body.statuses, actor.id);
      });
    },
    {
      body: t.Object({
        statuses: t.Array(
          t.Object({
            id: t.String({ pattern: '^[a-z][a-z0-9-]{0,39}$' }),
            name: t.String({ minLength: 1, maxLength: 60 }),
            color: t.Optional(t.String({ pattern: '^#[0-9a-fA-F]{6}$' })),
            deleted: t.Optional(t.Boolean())
          }),
          { minItems: 1, maxItems: 100 }
        )
      })
    }
  )
  .patch(
    '/boards/:id/statuses/:statusId',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [current] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!current?.statuses.some((s) => s.id === params.statusId))
          throw status(404, { code: 'STATUS_NOT_FOUND' });
        return persistStatuses(
          tx,
          current,
          current.statuses.map((s) => (s.id === params.statusId ? { ...s, ...body } : s)),
          actor.id
        );
      });
    },
    {
      body: t.Object(
        {
          name: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
          color: t.Optional(t.String({ pattern: '^#[0-9a-fA-F]{6}$' })),
          deleted: t.Optional(t.Boolean())
        },
        { additionalProperties: false }
      )
    }
  )
  .delete('/boards/:id/statuses/:statusId', async ({ db, user, params }) => {
    const actor = active(user);
    return db.transaction(async (tx) => {
      const { board, scope } = await boardScope(tx, params.id);
      requireLeader(actor, scope, 'projects.catalog.edit');
      const [current] = await tx.select().from(boards).where(eq(boards.id, board.id)).for('update');
      if (!current?.statuses.some((s) => s.id === params.statusId))
        throw status(404, { code: 'STATUS_NOT_FOUND' });
      return persistStatuses(
        tx,
        current,
        current.statuses.map((s) => (s.id === params.statusId ? { ...s, deleted: true } : s)),
        actor.id
      );
    });
  })
  .get(
    '/boards/:id/items',
    async ({ db, user, params, query }) => {
      const actor = active(user);
      const { board, scope } = await boardScope(db, params.id);
      if (query.graveyard === 'true') requireLeader(actor, scope, 'collaboration.items.restore');
      return db
        .select()
        .from(kanbanItems)
        .where(
          and(
            eq(kanbanItems.boardId, board.id),
            query.graveyard === 'true'
              ? isNotNull(kanbanItems.deletedAt)
              : isNull(kanbanItems.deletedAt)
          )
        )
        .orderBy(kanbanItems.position, kanbanItems.createdAt);
    },
    { query: t.Object({ graveyard: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])) }) }
  )
  .put(
    '/boards/:id/order',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        assertContribute(actor, scope);
        const [lockedBoard] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('update');
        if (!lockedBoard || !statusExists(lockedBoard.statuses, body.column))
          throw status(422, { code: 'INVALID_BOARD_STATUS' });
        const current = await tx
          .select()
          .from(kanbanItems)
          .where(
            and(
              eq(kanbanItems.boardId, board.id),
              eq(kanbanItems.column, body.column),
              isNull(kanbanItems.deletedAt)
            )
          )
          .for('update');
        if (body.move) {
          const [moving] = await tx
            .select()
            .from(kanbanItems)
            .where(
              and(
                eq(kanbanItems.id, body.move.id),
                eq(kanbanItems.boardId, board.id),
                eq(kanbanItems.column, body.move.fromColumn),
                isNull(kanbanItems.deletedAt)
              )
            )
            .for('update');
          if (!moving || body.move.fromColumn === body.column)
            throw status(409, { code: 'REVISION_CONFLICT_OR_DELETED' });
          current.push(moving);
        }
        const expected = new Map(body.items.map((item) => [item.id, item.version]));
        if (
          expected.size !== body.items.length ||
          current.length !== expected.size ||
          current.some((item) => expected.get(item.id) !== item.version)
        )
          throw status(409, { code: 'REVISION_CONFLICT_OR_DELETED' });
        const result = [];
        for (const [position, item] of body.items.entries()) {
          const [updated] = await tx
            .update(kanbanItems)
            .set({ column: body.column, position, version: sql`${kanbanItems.version} + 1` })
            .where(eq(kanbanItems.id, item.id))
            .returning();
          result.push(updated!);
        }
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.reordered',
          targetId: board.id,
          metadata: {
            boardId: board.id,
            column: body.column,
            ...(body.move ? { fromColumn: body.move.fromColumn, itemId: body.move.id } : {}),
            itemIds: body.items.map((item) => item.id),
            changes: [
              ...(body.move
                ? contentChanges(
                    current.find((item) => item.id === body.move!.id)!,
                    result.find((item) => item.id === body.move!.id)!,
                    taskChangeFields
                  )
                : []),
              ...contentChanges(
                {
                  order: current
                    .filter((item) => item.column === body.column)
                    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
                    .map((item) => item.id)
                },
                { order: body.items.map((item) => item.id) },
                ['order']
              )
            ]
          }
        });
        return result;
      });
    },
    {
      body: t.Object({
        column: t.String({ minLength: 1, maxLength: 40 }),
        move: t.Optional(
          t.Object({
            id: t.String({ minLength: 1 }),
            fromColumn: t.String({ minLength: 1, maxLength: 40 })
          })
        ),
        items: t.Array(t.Object({ id: t.String(), version: t.Integer({ minimum: 1 }) }), {
          maxItems: 10000
        })
      })
    }
  )
  .post(
    '/boards/:id/items',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { board, scope } = await boardScope(tx, params.id);
        assertContribute(actor, scope);
        await validateAssignees(tx, body.assigneeIds ?? [], scope);
        const [lockedBoard] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('share');
        if (!lockedBoard || !validLabels(body.labels, lockedBoard.labels))
          throw status(422, { code: 'INVALID_BOARD_LABELS' });
        if (!statusExists(lockedBoard.statuses, body.column))
          throw status(422, { code: 'INVALID_BOARD_STATUS' });
        const [item] = await tx
          .insert(kanbanItems)
          .values({
            ...body,
            dueAt: body.dueAt ? new Date(body.dueAt) : null,
            authorId: actor.id,
            boardId: board.id
          })
          .returning();
        if (!item) throw new Error('Item creation failed');
        await syncFileReferences(tx, 'item', item.id, item.markdown, actor);
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.created',
          targetId: item.id,
          metadata: {
            boardId: board.id,
            itemId: item.id,
            version: item.version,
            changes: contentChanges({}, item, taskChangeFields)
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'item', item.id, actor.id, {
          markdown: item.markdown,
          assigneeIds: item.assigneeIds
        });
        await subscribe(tx, 'item', item.id, actor.id);
        return item;
      });
    },
    {
      body: t.Object({
        title,
        assigneeIds: t.Optional(assigneeIds),
        dueAt: t.Optional(dueDate),
        markdown: t.String({ maxLength: 500000, pattern: internalMarkdownPattern }),
        labels,
        column: t.String({ minLength: 1, maxLength: 40 }),
        position: t.Integer({ minimum: 0 })
      })
    }
  )
  .patch(
    '/items/:id',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { item, board, scope } = await itemScope(tx, params.id);
        assertContribute(actor, scope);
        await validateAssignees(tx, body.assigneeIds ?? [], scope);
        const [lockedBoard] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('share');
        if (body.labels && (!lockedBoard || !validLabels(body.labels, lockedBoard.labels)))
          throw status(422, { code: 'INVALID_BOARD_LABELS' });
        if (body.column && (!lockedBoard || !statusExists(lockedBoard.statuses, body.column)))
          throw status(422, { code: 'INVALID_BOARD_STATUS' });
        const { version, dueAt, ...values } = body;
        const [updated] = await tx
          .update(kanbanItems)
          .set({
            ...values,
            ...(dueAt === undefined ? {} : { dueAt: dueAt ? new Date(dueAt) : null }),
            version: sql`${kanbanItems.version} + 1`
          })
          .where(
            and(
              eq(kanbanItems.id, item.id),
              eq(kanbanItems.version, version),
              isNull(kanbanItems.deletedAt)
            )
          )
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT_OR_DELETED' });
        await syncFileReferences(tx, 'item', updated.id, updated.markdown, actor);
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.updated',
          targetId: item.id,
          metadata: {
            boardId: board.id,
            itemId: item.id,
            version: updated.version,
            changes: contentChanges(item, updated, taskChangeFields)
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'item', item.id, actor.id, {
          markdown: body.markdown,
          assigneeIds: updated.assigneeIds.filter((id) => !item.assigneeIds.includes(id)),
          watch: dueAt !== undefined || Object.keys(values).some((key) => key !== 'position')
        });
        return updated;
      });
    },
    {
      body: t.Object({
        version: t.Integer({ minimum: 1 }),
        assigneeIds: t.Optional(assigneeIds),
        dueAt: t.Optional(dueDate),
        title: t.Optional(title),
        markdown: t.Optional(t.String({ maxLength: 500000, pattern: internalMarkdownPattern })),
        labels: t.Optional(labels),
        column: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
        position: t.Optional(t.Integer({ minimum: 0 }))
      })
    }
  )
  .delete(
    '/items/:id',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { item, board, scope } = await itemScope(tx, params.id);
        assertContribute(actor, scope);
        const [updated] = await tx
          .update(kanbanItems)
          .set({ deletedAt: new Date(), version: sql`${kanbanItems.version} + 1` })
          .where(
            and(
              eq(kanbanItems.id, item.id),
              eq(kanbanItems.version, body.version),
              isNull(kanbanItems.deletedAt)
            )
          )
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT_OR_DELETED' });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.tombstoned',
          targetId: item.id,
          metadata: {
            boardId: board.id,
            itemId: item.id,
            version: updated.version,
            changes: contentChanges(item, updated, ['deletedAt'])
          }
        });
        return updated;
      });
    },
    { body: t.Object({ version: t.Integer({ minimum: 1 }) }) }
  )
  .post(
    '/items/:id/restore',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { item, board, scope } = await itemScope(tx, params.id);
        requireLeader(actor, scope, 'collaboration.items.restore');
        const [currentBoard] = await tx
          .select()
          .from(boards)
          .where(eq(boards.id, board.id))
          .for('share');
        if (!currentBoard || !statusExists(currentBoard.statuses, item.column))
          throw status(409, { code: 'STATUS_DELETED' });
        const [updated] = await tx
          .update(kanbanItems)
          .set({ deletedAt: null, version: sql`${kanbanItems.version} + 1` })
          .where(
            and(
              eq(kanbanItems.id, item.id),
              eq(kanbanItems.version, body.version),
              isNotNull(kanbanItems.deletedAt)
            )
          )
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT_OR_NOT_DELETED' });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.restored',
          targetId: item.id,
          metadata: {
            boardId: board.id,
            itemId: item.id,
            version: updated.version,
            changes: contentChanges(item, updated, ['deletedAt'])
          }
        });
        return updated;
      });
    },
    { body: t.Object({ version: t.Integer({ minimum: 1 }) }) }
  )
  .get(
    '/items/:id/revisions',
    async ({ db, user, params, query }) => {
      const actor = active(user);
      const { item, scope } = await itemScope(db, params.id);
      if (item.deletedAt) requireLeader(actor, scope, 'collaboration.items.restore');
      return contentRevisions(db, itemHistoryCondition(item.id), itemRevisionFields, query.page);
    },
    revisionQuery
  )
  .get(
    '/comments/:id/revisions',
    async ({ db, user, params, query }) => {
      const actor = active(user);
      const [comment] = await db.select().from(comments).where(eq(comments.id, params.id));
      if (!comment || comment.deletedAt) throw status(404, { code: 'COMMENT_NOT_FOUND' });
      if (comment.threadId) {
        const { thread, scope } = await threadScope(db, comment.threadId);
        assertThreadRead(actor, thread, scope);
      } else if (comment.itemId) {
        const { item, scope } = await itemScope(db, comment.itemId);
        if (item.deletedAt) requireLeader(actor, scope, 'collaboration.items.restore');
      } else throw status(404, { code: 'COMMENT_NOT_FOUND' });
      return contentRevisions(
        db,
        and(
          eq(auditEvents.targetId, comment.id),
          inArray(auditEvents.action, [
            'comments.edited',
            'kanban.comment.created',
            'threads.comment.created'
          ])
        )!,
        ['markdown'],
        query.page
      );
    },
    revisionQuery
  )
  .get(
    '/items/:id/activity',
    async ({ db, user, params, query }) => {
      const actor = active(user);
      const { item, scope } = await itemScope(db, params.id);
      if (item.deletedAt) requireLeader(actor, scope, 'collaboration.items.restore');
      const records = await historyRecords(
        db,
        itemHistoryCondition(item.id, true),
        query.page ?? 0
      );
      return records.slice(0, 20).map((record) => ({
        id: record.id,
        action: record.action,
        createdAt: record.createdAt,
        authorName: record.authorName,
        authorId: record.authorId,
        metadata: { changes: historyChanges(record.metadata, [...itemRevisionFields, 'deletedAt']) }
      }));
    },
    revisionQuery
  )
  .get('/items/:id/comments', async ({ db, user, params }) => {
    const actor = active(user);
    const { item, scope } = await itemScope(db, params.id);
    if (item.deletedAt) requireLeader(actor, scope, 'collaboration.items.restore');
    const posts = await db
      .select({
        id: comments.id,
        markdown: comments.markdown,
        createdAt: comments.createdAt,
        authorName: users.name,
        authorId: comments.authorId
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.itemId, item.id), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);
    const edited = await editedCommentIds(
      db,
      posts.map((post) => post.id)
    );
    return posts.map((post) => ({ ...post, edited: edited.has(post.id) }));
  })
  .post(
    '/items/:id/comments',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { item, board, scope } = await itemScope(tx, params.id);
        assertContribute(actor, scope);
        const [current] = await tx
          .select()
          .from(kanbanItems)
          .where(eq(kanbanItems.id, item.id))
          .for('share');
        if (!current || current.deletedAt) throw status(409, { code: 'ITEM_DELETED' });
        const [comment] = await tx
          .insert(comments)
          .values({ itemId: item.id, authorId: actor.id, markdown: body.markdown })
          .returning();
        if (!comment) throw new Error('Comment creation failed');
        await syncFileReferences(tx, 'comment', comment.id, comment.markdown, actor);
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: board.projectId,
          action: 'kanban.comment.created',
          targetId: comment.id,
          metadata: {
            itemId: item.id,
            boardId: board.id,
            changes: contentChanges({}, comment, ['markdown'])
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'item', item.id, actor.id, {
          markdown: comment.markdown
        });
        await subscribe(tx, 'item', item.id, actor.id);
        return comment;
      });
    },
    { body: t.Object({ markdown }) }
  )
  .get(
    '/threads',
    async ({ db, user, query }) => {
      const actor = active(user);
      const scope = await scopeFor(db, query.projectId ?? null);
      const records = await db
        .select()
        .from(threads)
        .where(
          and(
            query.projectId ? eq(threads.projectId, query.projectId) : isNull(threads.projectId),
            query.archived === 'true' ? isNotNull(threads.archivedAt) : isNull(threads.archivedAt)
          )
        )
        .orderBy(desc(threads.createdAt));
      return records.filter((thread) =>
        canReadThread(
          actor,
          scope,
          thread.visibility as 'association' | 'members' | 'leaders',
          thread.invitedIds
        )
      );
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        archived: t.Optional(t.Union([t.Literal('true'), t.Literal('false')]))
      })
    }
  )
  .post(
    '/threads',
    async ({ db, user, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const scope = await scopeFor(tx, body.projectId ?? null);
        assertContribute(actor, scope);
        await validateAssignees(tx, body.assigneeIds ?? [], scope);
        if (body.visibility === 'leaders' || body.invitedIds.length)
          requireLeader(actor, scope, 'collaboration.threads.restrict');
        if (body.invitedIds.length && body.visibility !== 'leaders')
          throw status(422, { code: 'INVITATIONS_REQUIRE_RESTRICTED_THREAD' });
        await validateInvitations(tx, body.invitedIds, scope);
        const [thread] = await tx
          .insert(threads)
          .values({
            projectId: body.projectId ?? null,
            title: body.title,
            assigneeIds: body.assigneeIds ?? [],
            visibility: body.visibility,
            invitedIds: body.invitedIds,
            authorId: actor.id
          })
          .returning();
        if (!thread) throw new Error('Thread creation failed');
        const [post] = await tx
          .insert(comments)
          .values({ threadId: thread.id, authorId: actor.id, markdown: body.markdown })
          .returning();
        if (post) await syncFileReferences(tx, 'comment', post.id, post.markdown, actor);
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: thread.projectId,
          action: 'threads.created',
          targetId: thread.id,
          metadata: {
            threadId: thread.id,
            version: thread.version,
            changes: contentChanges({}, { ...thread, markdown: body.markdown }, [
              'title',
              'markdown',
              'visibility',
              'invitedIds',
              'assigneeIds'
            ])
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'thread', thread.id, actor.id, {
          markdown: body.markdown,
          assigneeIds: thread.assigneeIds
        });
        await subscribe(tx, 'thread', thread.id, actor.id);
        return thread;
      });
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        title,
        assigneeIds: t.Optional(assigneeIds),
        markdown,
        visibility,
        invitedIds: t.Array(t.String(), { maxItems: 100, uniqueItems: true })
      })
    }
  )
  .get('/threads/:id', async ({ db, user, params }) => {
    const actor = active(user);
    const { thread, scope } = await threadScope(db, params.id);
    assertThreadRead(actor, thread, scope);
    const posts = await db
      .select({
        id: comments.id,
        markdown: comments.markdown,
        createdAt: comments.createdAt,
        authorName: users.name,
        authorId: comments.authorId
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.threadId, thread.id), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);
    const edited = await editedCommentIds(
      db,
      posts.map((post) => post.id)
    );
    return {
      ...thread,
      comments: posts.map((post) => ({ ...post, edited: edited.has(post.id) }))
    };
  })
  .get(
    '/threads/:id/activity',
    async ({ db, user, params, query }) => {
      const actor = active(user);
      const { thread, scope } = await threadScope(db, params.id);
      assertThreadRead(actor, thread, scope);
      const records = await historyRecords(
        db,
        threadHistoryCondition(db, thread.id),
        query.page ?? 0
      );
      return records.slice(0, 20).map((record) => ({
        id: record.id,
        action: record.action,
        createdAt: record.createdAt,
        targetId: record.targetId,
        authorName: record.authorName,
        authorId: record.authorId,
        metadata: { changes: historyChanges(record.metadata, threadRevisionFields) }
      }));
    },
    revisionQuery
  )
  .patch(
    '/threads/:id/assignees',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { thread, scope } = await threadScope(tx, params.id);
        assertThreadRead(actor, thread, scope);
        assertContribute(actor, scope);
        if (thread.archivedAt) throw status(409, { code: 'THREAD_ARCHIVED' });
        await validateAssignees(tx, body.assigneeIds, scope);
        const [updated] = await tx
          .update(threads)
          .set({ assigneeIds: body.assigneeIds, version: sql`${threads.version} + 1` })
          .where(and(eq(threads.id, thread.id), eq(threads.version, body.version)))
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT' });
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: thread.projectId,
          action: 'threads.assignees.updated',
          targetId: thread.id,
          metadata: {
            threadId: thread.id,
            version: updated.version,
            changes: contentChanges(thread, updated, ['assigneeIds'])
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'thread', thread.id, actor.id, {
          assigneeIds: updated.assigneeIds.filter((id) => !thread.assigneeIds.includes(id))
        });
        return updated;
      });
    },
    { body: t.Object({ version: t.Integer({ minimum: 1 }), assigneeIds }) }
  )
  .put(
    '/threads/:id/access',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { thread, scope } = await threadScope(tx, params.id);
        if (
          thread.authorId === actor.id &&
          thread.visibility !== 'leaders' &&
          body.visibility !== 'leaders' &&
          body.invitedIds.length === 0
        ) {
          assertContribute(actor, scope);
        } else requireLeader(actor, scope, 'collaboration.threads.restrict');
        if (body.invitedIds.length && body.visibility !== 'leaders')
          throw status(422, { code: 'INVITATIONS_REQUIRE_RESTRICTED_THREAD' });
        await validateInvitations(tx, body.invitedIds, scope);
        const [updated] = await tx
          .update(threads)
          .set({
            visibility: body.visibility,
            invitedIds: body.invitedIds,
            version: sql`${threads.version} + 1`
          })
          .where(and(eq(threads.id, thread.id), eq(threads.version, body.version)))
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT' });
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: thread.projectId,
          action: 'threads.access.updated',
          targetId: thread.id,
          metadata: {
            threadId: thread.id,
            version: updated.version,
            changes: contentChanges(thread, updated, ['visibility', 'invitedIds', 'archivedAt'])
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'thread', thread.id, actor.id);
        return updated;
      });
    },
    {
      body: t.Object({
        version: t.Integer({ minimum: 1 }),
        visibility,
        invitedIds: t.Array(t.String(), { maxItems: 100, uniqueItems: true })
      })
    }
  )
  .post(
    '/threads/:id/archive',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { thread, scope } = await threadScope(tx, params.id);
        requireLeader(actor, scope, 'collaboration.items.restore');
        const [updated] = await tx
          .update(threads)
          .set({
            archivedAt: body.archived ? new Date() : null,
            version: sql`${threads.version} + 1`
          })
          .where(and(eq(threads.id, thread.id), eq(threads.version, body.version)))
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT' });
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: thread.projectId,
          action: body.archived ? 'threads.archived' : 'threads.restored',
          targetId: thread.id,
          metadata: {
            threadId: thread.id,
            version: updated.version,
            changes: contentChanges(thread, updated, ['visibility', 'invitedIds', 'archivedAt'])
          }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'thread', thread.id, actor.id);
        return updated;
      });
    },
    { body: t.Object({ version: t.Integer({ minimum: 1 }), archived: t.Boolean() }) }
  )
  .post(
    '/threads/:id/comments',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const { thread, scope } = await threadScope(tx, params.id);
        assertThreadRead(actor, thread, scope);
        // Explicit invitations allow invited active members to participate in restricted discussions.
        if (
          !canContribute(actor, scope) &&
          !(thread.visibility === 'leaders' && thread.invitedIds.includes(actor.id))
        )
          throw status(403, { code: 'FORBIDDEN' });
        const [current] = await tx
          .select()
          .from(threads)
          .where(eq(threads.id, thread.id))
          .for('share');
        if (!current || current.archivedAt) throw status(409, { code: 'THREAD_ARCHIVED' });
        assertThreadRead(actor, current, scope);
        const [comment] = await tx
          .insert(comments)
          .values({ threadId: thread.id, authorId: actor.id, markdown: body.markdown })
          .returning();
        if (!comment) throw new Error('Comment creation failed');
        await syncFileReferences(tx, 'comment', comment.id, comment.markdown, actor);
        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId: thread.projectId,
          action: 'threads.comment.created',
          targetId: comment.id,
          metadata: { threadId: thread.id, changes: contentChanges({}, comment, ['markdown']) }
        });
        await notifyCollaboration(tx, notificationEvent.id, 'thread', thread.id, actor.id, {
          markdown: comment.markdown
        });
        await subscribe(tx, 'thread', thread.id, actor.id);
        return comment;
      });
    },
    { body: t.Object({ markdown }) }
  )
  .patch(
    '/comments/:id',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'collaboration.items.contribute');
      return db.transaction(async (tx) => {
        const [comment] = await tx
          .select()
          .from(comments)
          .where(eq(comments.id, params.id))
          .for('update');
        if (!comment || comment.deletedAt) throw status(404, { code: 'COMMENT_NOT_FOUND' });

        let projectId: string | null = null;
        const metadata: Record<string, unknown> = {
          changes: contentChanges(comment, body, ['markdown'])
        };
        if (comment.threadId) {
          const { thread, scope } = await threadScope(tx, comment.threadId);
          assertThreadRead(actor, thread, scope);
          if (comment.authorId !== actor.id)
            requireLeader(actor, scope, 'collaboration.items.restore');
          else assertContribute(actor, scope);
          if (thread.archivedAt) throw status(409, { code: 'THREAD_ARCHIVED' });
          projectId = thread.projectId;
          metadata.threadId = thread.id;
        } else if (comment.itemId) {
          const { item, board, scope } = await itemScope(tx, comment.itemId);
          if (comment.authorId !== actor.id)
            requireLeader(actor, scope, 'collaboration.items.restore');
          else assertContribute(actor, scope);
          if (item.deletedAt) throw status(409, { code: 'ITEM_DELETED' });
          projectId = board.projectId;
          metadata.boardId = board.id;
          metadata.itemId = item.id;
        } else throw status(409, { code: 'INVALID_COMMENT' });

        const [updated] = await tx
          .update(comments)
          .set({ markdown: body.markdown })
          .where(eq(comments.id, comment.id))
          .returning();
        await syncFileReferences(tx, 'comment', comment.id, body.markdown, actor);

        const notificationEvent = await recordEvent(tx, {
          actorId: actor.id,
          projectId,
          action: 'comments.edited',
          targetId: comment.id,
          metadata
        });
        if (comment.itemId || comment.threadId)
          await notifyCollaboration(
            tx,
            notificationEvent.id,
            comment.itemId ? 'item' : 'thread',
            (comment.itemId ?? comment.threadId)!,
            actor.id,
            { markdown: body.markdown }
          );
        return updated;
      });
    },
    { body: t.Object({ markdown }) }
  )
  .delete('/comments/:id', async ({ db, user, params }) => {
    const actor = requirePermission(user, 'collaboration.items.contribute');
    return db.transaction(async (tx) => {
      const [comment] = await tx
        .select()
        .from(comments)
        .where(eq(comments.id, params.id))
        .for('update');
      if (!comment || comment.deletedAt) throw status(404, { code: 'COMMENT_NOT_FOUND' });
      let projectId: string | null = null;
      const metadata: Record<string, unknown> = {
        changes: contentChanges(comment, { markdown: null }, ['markdown'])
      };
      if (comment.threadId) {
        const { thread, scope } = await threadScope(tx, comment.threadId);
        assertThreadRead(actor, thread, scope);
        if (comment.authorId !== actor.id)
          requireLeader(actor, scope, 'collaboration.items.restore');
        else assertContribute(actor, scope);
        if (thread.archivedAt) throw status(409, { code: 'THREAD_ARCHIVED' });
        projectId = thread.projectId;
        metadata.threadId = thread.id;
      } else if (comment.itemId) {
        const { item, board, scope } = await itemScope(tx, comment.itemId);
        if (comment.authorId !== actor.id)
          requireLeader(actor, scope, 'collaboration.items.restore');
        else assertContribute(actor, scope);
        if (item.deletedAt) throw status(409, { code: 'ITEM_DELETED' });
        projectId = board.projectId;
        metadata.itemId = item.id;
        metadata.boardId = board.id;
      } else throw status(409, { code: 'INVALID_COMMENT' });
      await tx.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, comment.id));
      await recordEvent(tx, {
        actorId: actor.id,
        projectId,
        action: 'comments.removed',
        targetId: comment.id,
        metadata
      });
      return { deleted: true };
    });
  })
  .get(
    '/events',
    async ({ db, user, query }) => {
      const actor = active(user);
      const scope = await scopeFor(db, query.projectId ?? null);
      requireLeader(actor, scope, 'audit.events.read');
      return db
        .select({
          event: auditEvents,
          actorName: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          projectSlug: projects.slug
        })
        .from(auditEvents)
        .leftJoin(users, eq(auditEvents.actorId, users.id))
        .leftJoin(projects, eq(auditEvents.projectId, projects.id))
        .where(
          query.projectId
            ? eq(auditEvents.projectId, query.projectId)
            : isNull(auditEvents.projectId)
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(query.limit ?? 100);
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 }))
      })
    }
  );
