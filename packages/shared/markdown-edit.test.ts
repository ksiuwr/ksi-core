import { expect, test } from 'bun:test';
import { rebaseTextRange } from './markdown-edit';

test('pending image selections follow edits before and after the paste location', () => {
  const source = 'before selected after';
  const range = { start: 7, end: 15 };
  expect(rebaseTextRange(source, `prefix ${source}`, range)).toEqual({ start: 14, end: 22 });
  expect(rebaseTextRange(source, `${source} typed`, range)).toEqual(range);
  expect(rebaseTextRange(source, 'selected after', range)).toEqual({ start: 0, end: 8 });
});

test('typing over a pending selection keeps the new text instead of replacing it', () => {
  expect(
    rebaseTextRange('before selected after', 'before typed after', { start: 7, end: 15 })
  ).toEqual({ start: 12, end: 12 });
  expect(rebaseTextRange('selected', '', { start: 0, end: 8 })).toEqual({ start: 0, end: 0 });
});

test('queued image pastes at the same caret keep their order', () => {
  const inserted = '\n![image](file:first_image)\n';
  expect(rebaseTextRange('before after', `before${inserted} after`, { start: 6, end: 6 })).toEqual({
    start: 6 + inserted.length,
    end: 6 + inserted.length
  });
});

test('known input ranges disambiguate edits in repeated text', () => {
  expect(rebaseTextRange('aaaa', 'aaaaa', { start: 2, end: 2 }, { start: 0, end: 0 })).toEqual({
    start: 3,
    end: 3
  });
  expect(rebaseTextRange('aaaa', 'aaa', { start: 2, end: 2 }, { start: 0, end: 1 })).toEqual({
    start: 1,
    end: 1
  });
  expect(rebaseTextRange('aaaa', 'aaa', { start: 2, end: 2 }, { start: 3, end: 4 })).toEqual({
    start: 2,
    end: 2
  });
});

test('retyping the same selected text keeps it when the upload completes', () => {
  expect(rebaseTextRange('a', 'a', { start: 0, end: 1 }, { start: 0, end: 1 })).toEqual({
    start: 1,
    end: 1
  });
});
