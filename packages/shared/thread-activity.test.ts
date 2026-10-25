import { expect, test } from 'bun:test';
import { threadActivitySummary } from './thread-activity';

test('thread lifecycle events have concise summaries', () => {
  expect(threadActivitySummary('threads.created', null)).toEqual([{ kind: 'created' }]);
  expect(threadActivitySummary('threads.archived', null)).toEqual([{ kind: 'archived' }]);
  expect(threadActivitySummary('threads.restored', [])).toEqual([{ kind: 'restored' }]);
});

test('access changes name the visibility and count invitation changes', () => {
  expect(
    threadActivitySummary('threads.access.updated', [
      { field: 'visibility', before: 'members', after: 'leaders' },
      { field: 'invitedIds', before: ['a'], after: ['a', 'b', 'c'] }
    ])
  ).toEqual([
    { kind: 'visibility', before: 'members', after: 'leaders' },
    { kind: 'invited', count: 2 }
  ]);
  expect(
    threadActivitySummary('threads.access.updated', [
      { field: 'invitedIds', before: ['a', 'b'], after: [] }
    ])
  ).toEqual([{ kind: 'uninvited', count: 2 }]);
  expect(
    threadActivitySummary('threads.access.updated', [
      { field: 'visibility', before: 'members', after: 'members' },
      { field: 'invitedIds', before: [], after: [] }
    ])
  ).toEqual([{ kind: 'access' }]);
});

test('assignee changes name who was added and removed', () => {
  expect(
    threadActivitySummary('threads.assignees.updated', [
      { field: 'assigneeIds', before: ['a'], after: ['b', 'c'] }
    ])
  ).toEqual([
    { kind: 'assignee-added', ids: ['b', 'c'] },
    { kind: 'assignee-removed', ids: ['a'] }
  ]);
});

test('comment events stay short and never expose their text', () => {
  expect(threadActivitySummary('threads.comment.created', null)).toEqual([
    { kind: 'comment-added' }
  ]);
  expect(
    threadActivitySummary('comments.edited', [
      { field: 'markdown', before: 'Long old body', after: 'Long new body' }
    ])
  ).toEqual([{ kind: 'comment-edited' }]);
  expect(threadActivitySummary('comments.removed', null)).toEqual([{ kind: 'comment-removed' }]);
  expect(
    JSON.stringify(
      threadActivitySummary('comments.edited', [
        { field: 'markdown', before: 'Old secret', after: 'New secret' }
      ])
    )
  ).not.toContain('secret');
});

test('unknown thread actions fall back to a generic update', () => {
  expect(threadActivitySummary('threads.mystery', null)).toEqual([{ kind: 'updated' }]);
});
