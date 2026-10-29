export type TextRange = { start: number; end: number };

// Follow a pending insertion through edits without replacing text typed while an
// upload was in flight. An edit touching its selection collapses that selection.
export function rebaseTextRange(
  before: string,
  after: string,
  range: TextRange,
  edit?: TextRange
): TextRange {
  if (before === after && !edit) return range;
  if (edit) {
    const newEnd = after.length - (before.length - edit.end);
    if (
      newEnd >= edit.start &&
      before.slice(0, edit.start) === after.slice(0, edit.start) &&
      before.slice(edit.end) === after.slice(newEnd)
    )
      return moveRange(range, edit.start, edit.end, newEnd);
  }
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  return moveRange(range, start, oldEnd, newEnd);
}

function moveRange(range: TextRange, start: number, oldEnd: number, newEnd: number) {
  const delta = newEnd - oldEnd;
  if (oldEnd <= range.start) return { start: range.start + delta, end: range.end + delta };
  if (start >= range.end) return range;
  const end = Math.max(newEnd, range.end + delta);
  return { start: end, end };
}
