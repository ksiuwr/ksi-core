import { expect, test } from 'bun:test';
import {
  contentChanges,
  hasContentChange,
  taskChangeFields,
  profileChangeFields,
  accessChangeFields
} from './activity';
test('task activity tracks labels and positions without logging unrelated data', () => {
  expect(
    contentChanges(
      { title: 'Old', labels: ['UI'], position: 0, password: 'secret' },
      { title: 'New', labels: ['UI'], position: 0, password: 'new' },
      taskChangeFields
    )
  ).toEqual([{ field: 'title', before: 'Old', after: 'New' }]);
  expect(
    contentChanges({ labels: [], position: 0 }, { labels: ['UI'], position: 2 }, taskChangeFields)
  ).toEqual([
    { field: 'labels', before: [], after: ['UI'] },
    { field: 'position', before: 0, after: 2 }
  ]);
});
test('user audit field lists exclude email, credentials, sessions and unrelated account data', () => {
  const before = {
    nickname: 'Old',
    bio: null,
    role: 'member',
    flags: [],
    email: 'old@example.test',
    password: 'secret',
    token: 'old',
    image: 'old'
  };
  const after = {
    nickname: 'New',
    bio: 'Biography',
    role: 'board',
    flags: ['+audit.events.read'],
    email: 'new@example.test',
    password: 'new secret',
    token: 'new',
    image: 'new'
  };
  expect(contentChanges(before, after, profileChangeFields)).toEqual([
    { field: 'nickname', before: 'Old', after: 'New' },
    { field: 'bio', before: null, after: 'Biography' }
  ]);
  expect(contentChanges(before, after, accessChangeFields)).toEqual([
    { field: 'role', before: 'member', after: 'board' },
    { field: 'flags', before: [], after: ['+audit.events.read'] }
  ]);
});

test('JSONB object key ordering does not create false changes; array order still matters', () => {
  expect(
    contentChanges(
      { labels: [{ name: 'Bug', color: '#666666' }] },
      { labels: [{ color: '#666666', name: 'Bug' }] },
      ['labels']
    )
  ).toEqual([]);
  expect(contentChanges({ labels: ['A', 'B'] }, { labels: ['B', 'A'] }, ['labels'])).toHaveLength(
    1
  );
  expect(
    contentChanges(
      { date: new Date('2026-10-24T00:00:00Z') },
      { date: '2026-10-24T00:00:00.000Z' },
      ['date']
    )
  ).toEqual([]);
});

test('unset form fields do not create phantom activity changes', () => {
  expect(
    contentChanges(
      { lastName: 'dupa', nickname: null, bio: null },
      { lastName: 'dupad', nickname: '', bio: '' },
      profileChangeFields
    )
  ).toEqual([{ field: 'lastName', before: 'dupa', after: 'dupad' }]);
  for (const before of [null, undefined, '', []]) {
    for (const after of [null, undefined, '', []])
      expect(hasContentChange(before, after)).toBe(false);
  }
  expect(hasContentChange('Biography', '')).toBe(true);
  expect(hasContentChange(null, 'Biography')).toBe(true);
  expect(hasContentChange(null, false)).toBe(true);
  expect(hasContentChange(null, 0)).toBe(true);
  expect(hasContentChange(null, ' ')).toBe(true);
  expect(hasContentChange(null, 'Not set')).toBe(true);
  expect(hasContentChange(['UI'], [])).toBe(true);
});
