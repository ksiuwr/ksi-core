import { expect, test } from 'bun:test';
import { contentChanges, taskChangeFields } from './activity';
test('activity records changed allowlisted values and ignores credentials and unchanged arrays', () => {
  expect(
    contentChanges(
      { title: 'Old', tags: ['UI'], password: 'secret' },
      { title: 'New', tags: ['UI'], password: 'new' },
      taskChangeFields
    )
  ).toEqual([{ field: 'title', before: 'Old', after: 'New' }]);
  expect(
    contentChanges({ dueAt: null }, { dueAt: new Date('2026-12-01Z') }, taskChangeFields)
  ).toHaveLength(1);
});
