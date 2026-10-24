import { expect, test } from 'bun:test';
import { activityDiffRows } from './activity-diff';
test('line comparisons align inserted and removed lines with unchanged context', () => {
  const rows = activityDiffRows('First\nLast', 'First\nInserted\nLast');
  expect(rows).toEqual([
    { before: { number: 1, text: 'First' }, after: { number: 1, text: 'First' }, changed: false },
    { before: null, after: { number: 2, text: 'Inserted' }, changed: true },
    { before: { number: 2, text: 'Last' }, after: { number: 3, text: 'Last' }, changed: false }
  ]);
  const removed = activityDiffRows('First\nRemoved\nLast', 'First\nLast');
  expect(removed[1]).toEqual({
    before: { number: 2, text: 'Removed' },
    after: null,
    changed: true
  });
  expect(removed[2]?.changed).toBe(false);
});
test('line comparisons preserve whitespace, markup and blank lines as literal text', () => {
  const rows = activityDiffRows(
    'Old\n\n<script>alert(1)</script>',
    'New\n\n<script>alert(1)</script>'
  );
  expect(rows[0]?.changed).toBe(true);
  expect(rows[1]?.before?.text).toBe('');
  expect(rows[2]?.before?.text).toBe('<script>alert(1)</script>');
  expect(rows[2]?.changed).toBe(false);
  expect(activityDiffRows('same', 'same').every((row) => !row.changed)).toBe(true);
});
test('long activity descriptions preserve line numbering without a quadratic comparison', () => {
  const text = Array.from({ length: 10000 }, (_, i) => `Line ${i}`).join('\n');
  const rows = activityDiffRows(text, text + '\nExtra');
  expect(rows).toHaveLength(10001);
  expect(rows.at(-1)).toEqual({
    before: null,
    after: { number: 10001, text: 'Extra' },
    changed: true
  });
});
