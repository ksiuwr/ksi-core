export type DiffLine = { number: number; text: string };
export type DiffRow = { before: DiffLine | null; after: DiffLine | null; changed: boolean };

/** Align unchanged context around an edited block without quadratic work on long descriptions. */
export function activityDiffRows(before: string, after: string): DiffRow[] {
  const left = before.split('\n');
  const right = after.split('\n');
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  )
    suffix++;
  const rows: DiffRow[] = [];
  const line = (lines: string[], index: number): DiffLine => ({
    number: index + 1,
    text: lines[index]!
  });
  for (let i = 0; i < prefix; i++)
    rows.push({ before: line(left, i), after: line(right, i), changed: false });
  const removed = left.length - prefix - suffix;
  const added = right.length - prefix - suffix;
  for (let i = 0; i < Math.max(removed, added); i++) {
    const previous = i < removed ? line(left, prefix + i) : null;
    const next = i < added ? line(right, prefix + i) : null;
    rows.push({ before: previous, after: next, changed: previous?.text !== next?.text });
  }
  for (let i = suffix; i > 0; i--)
    rows.push({
      before: line(left, left.length - i),
      after: line(right, right.length - i),
      changed: false
    });
  return rows;
}
