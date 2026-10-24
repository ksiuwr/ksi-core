import { expect, test } from 'bun:test';
import { reminderInterval } from './deadlines';
test('reminders select one current interval and include overdue tasks', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  for (const [days, expected] of [
    [8, null],
    [7, 7],
    [4, 7],
    [3, 3],
    [2, 3],
    [1, 1],
    [0, 0],
    [-1, 0]
  ] as const)
    expect(reminderInterval(new Date(now.getTime() + days * 86400000), now)).toBe(expected);
});
