import { expect, test } from 'bun:test';
import { taskActivitySummary } from './task-activity';

test('description changes produce a short action without exposing their text', () => {
  const summary = taskActivitySummary('kanban.updated', [
    { field: 'markdown', before: 'Long old body', after: 'Long new body' }
  ]);
  expect(summary).toEqual([{ kind: 'description' }]);
  expect(JSON.stringify(summary)).not.toContain('body');
});
test('summaries describe renamed tasks, status changes and actual label additions/removals', () => {
  expect(
    taskActivitySummary('kanban.updated', [
      { field: 'title', before: 'Old title', after: 'New title' },
      { field: 'column', before: 'todo', after: 'progress' },
      { field: 'labels', before: ['Bug', 'UI'], after: ['UI', 'Ready', 'Ready'] },
      { field: 'bio', before: null, after: '' }
    ])
  ).toEqual([
    { kind: 'renamed', before: 'Old title', after: 'New title' },
    { kind: 'moved', before: 'todo', after: 'progress' },
    { kind: 'label-added', labels: ['Ready'] },
    { kind: 'label-removed', labels: ['Bug'] }
  ]);
});
test('assignee changes name who was added and removed', () => {
  expect(
    taskActivitySummary('kanban.updated', [
      { field: 'assigneeIds', before: ['a', 'b'], after: ['b', 'c', 'd'] }
    ])
  ).toEqual([
    { kind: 'assignee-added', ids: ['c', 'd'] },
    { kind: 'assignee-removed', ids: ['a'] }
  ]);
});
test('lifecycle and older events have concise summaries without inventing changes', () => {
  expect(
    taskActivitySummary('kanban.created', [
      { field: 'markdown', before: null, after: 'Initial description' }
    ])
  ).toEqual([{ kind: 'created' }]);
  expect(taskActivitySummary('kanban.tombstoned', null)).toEqual([{ kind: 'deleted' }]);
  expect(taskActivitySummary('kanban.restored', [])).toEqual([{ kind: 'restored' }]);
  expect(taskActivitySummary('kanban.updated', null)).toEqual([{ kind: 'updated' }]);
  expect(
    taskActivitySummary('kanban.updated', [
      { field: 'labels', before: ['A', 'B'], after: ['B', 'A'] }
    ])
  ).toEqual([{ kind: 'updated' }]);
});

test('deadline changes summarize set, moved and cleared deadlines in UTC stamps', () => {
  const noon = (days: number) => new Date(Date.UTC(2030, 0, 1 + days, 9)).toISOString();
  expect(
    taskActivitySummary('kanban.updated', [{ field: 'dueAt', before: null, after: noon(3) }])
  ).toEqual([{ kind: 'deadline', before: null, after: noon(3) }]);
  expect(
    taskActivitySummary('kanban.updated', [{ field: 'dueAt', before: noon(3), after: noon(10) }])
  ).toEqual([{ kind: 'deadline', before: noon(3), after: noon(10) }]);
  expect(
    taskActivitySummary('kanban.updated', [{ field: 'dueAt', before: noon(3), after: null }])
  ).toEqual([{ kind: 'deadline', before: noon(3), after: null }]);
  expect(
    taskActivitySummary('kanban.updated', [
      { field: 'dueAt', before: 'not-a-date', after: 'not-a-date-either' }
    ])
  ).toEqual([{ kind: 'updated' }]);
});

test('label definition edits name the label and distinguish rename, color and description', () => {
  expect(
    taskActivitySummary('kanban.label.updated', [
      {
        field: 'label',
        before: { name: 'Bug', color: '#ef4444', description: 'Broken' },
        after: { name: 'Defect', color: '#10b981', description: 'Needs fixing' }
      }
    ])
  ).toEqual([
    { kind: 'label-renamed', before: 'Bug', after: 'Defect' },
    { kind: 'label-color', label: 'Defect', before: '#ef4444', after: '#10b981' },
    { kind: 'label-description', label: 'Defect', operation: 'changed' }
  ]);
  for (const [before, after, operation] of [
    [undefined, 'New description', 'added'],
    ['Old description', '', 'removed']
  ] as const) {
    expect(
      taskActivitySummary('kanban.label.updated', [
        {
          field: 'label',
          before: { name: 'UI', description: before },
          after: { name: 'UI', description: after }
        }
      ])
    ).toEqual([{ kind: 'label-description', label: 'UI', operation }]);
  }
});
