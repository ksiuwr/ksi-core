/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  activeFilterCount,
  deadlineUrgency,
  emptyTaskFilters,
  filterTasks,
  involvedTaskIds,
  matchesDeadline,
  matchesQuery,
  matchesScope,
  matchesTaskFilters,
  normalizeSearchText,
  parseTaskFilters,
  renameFilterLabel,
  writeTaskFilters,
  type FilterContext,
  type FilterableTask,
  type TaskFilters
} from './task-filters';

const me = 'user-me';
const other = 'user-other';
// Local noon keeps calendar-day assertions independent of the test machine's time zone.
const now = new Date(2026, 9, 29, 12, 0, 0).getTime();
const hours = (count: number) => new Date(now + count * 3_600_000).toISOString();

function task(overrides: Partial<FilterableTask> = {}): FilterableTask {
  return {
    id: 'task',
    title: 'Task',
    markdown: '',
    column: 'todo',
    labels: [],
    assigneeIds: [],
    dueAt: null,
    referenceNumber: null,
    authorId: other,
    ...overrides
  };
}

const filters = (overrides: Partial<TaskFilters> = {}): TaskFilters => ({
  ...emptyTaskFilters,
  ...overrides
});
const context = (overrides: Partial<FilterContext> = {}): FilterContext => ({
  userId: me,
  now,
  ...overrides
});

describe('task filter URL state', () => {
  test('round-trips every filter while preserving unrelated parameters', () => {
    const state = filters({
      query: 'login bug',
      scope: 'involves',
      assignees: ['a', 'b'],
      unassigned: true,
      labels: ['bug', 'needs, review'],
      unlabeled: true,
      deadline: 'week'
    });
    const params = writeTaskFilters(new URLSearchParams('item=x&q=old&label=stale'), state);
    expect(params.get('item')).toBe('x');
    expect(params.getAll('label')).toEqual(['bug', 'needs, review']);
    expect(parseTaskFilters(params)).toEqual(state);
  });

  test('omits defaults so an unfiltered board keeps a clean URL', () => {
    expect(writeTaskFilters(new URLSearchParams(), filters({ query: '   ' })).toString()).toBe('');
  });

  test('ignores unknown values and duplicates', () => {
    const parsed = parseTaskFilters(
      new URLSearchParams('scope=everyone&due=someday&assignee=a&assignee=a&assignee=&unassigned=0')
    );
    expect(parsed).toEqual(filters({ assignees: ['a'] }));
  });

  test('counts each active facet once', () => {
    expect(activeFilterCount(emptyTaskFilters)).toBe(0);
    expect(
      activeFilterCount(
        filters({ query: 'x', assignees: ['a', 'b'], unassigned: true, deadline: 'overdue' })
      )
    ).toBe(3);
  });
});

describe('text search', () => {
  test('normalizes case, accents and the Polish ł', () => {
    expect(normalizeSearchText('Zażółć GĘŚLĄ jaźń Łódź')).toBe('zazolc gesla jazn lodz');
  });

  test('requires every term to match title, description or labels', () => {
    const item = task({
      title: 'Napraw logowanie',
      markdown: 'Błąd po **SSO**',
      labels: ['Pilne']
    });
    expect(matchesQuery(item, 'logowanie')).toBe(true);
    expect(matchesQuery(item, 'blad sso')).toBe(true);
    expect(matchesQuery(item, 'PILNE logowanie')).toBe(true);
    expect(matchesQuery(item, 'logowanie rejestracja')).toBe(false);
    expect(matchesQuery(item, '   ')).toBe(true);
  });

  test('matches #references exactly', () => {
    const item = task({ referenceNumber: 12 });
    expect(matchesQuery(item, '#12')).toBe(true);
    expect(matchesQuery(item, '#1')).toBe(false);
    expect(matchesQuery(task({ referenceNumber: 123 }), '#12')).toBe(false);
    expect(matchesQuery(task(), '#12')).toBe(false);
  });
});

describe('deadline filters', () => {
  test('overdue excludes completed tasks', () => {
    expect(matchesDeadline(task({ dueAt: hours(-1) }), 'overdue', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: hours(-1), column: 'done' }), 'overdue', now)).toBe(false);
    expect(matchesDeadline(task({ dueAt: hours(1) }), 'overdue', now)).toBe(false);
  });

  test('today follows the local calendar day', () => {
    const at = (hour: number, day = 29) => new Date(2026, 9, day, hour, 30).toISOString();
    expect(matchesDeadline(task({ dueAt: at(0) }), 'today', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: at(23) }), 'today', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: at(0, 30) }), 'today', now)).toBe(false);
    expect(matchesDeadline(task({ dueAt: at(23, 28) }), 'today', now)).toBe(false);
  });

  test('forward windows start now and have exclusive ends', () => {
    expect(matchesDeadline(task({ dueAt: hours(0) }), 'week', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: hours(7 * 24 - 1) }), 'week', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: hours(7 * 24) }), 'week', now)).toBe(false);
    expect(matchesDeadline(task({ dueAt: hours(-1) }), 'week', now)).toBe(false);
    expect(matchesDeadline(task({ dueAt: hours(29 * 24) }), 'month', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: hours(30 * 24) }), 'month', now)).toBe(false);
  });

  test('distinguishes tasks with and without a deadline', () => {
    expect(matchesDeadline(task({ dueAt: hours(5) }), 'dated', now)).toBe(true);
    expect(matchesDeadline(task(), 'dated', now)).toBe(false);
    expect(matchesDeadline(task(), 'undated', now)).toBe(true);
    expect(matchesDeadline(task({ dueAt: 'not a date' }), 'undated', now)).toBe(true);
    expect(matchesDeadline(task(), null, now)).toBe(true);
  });

  test('flags overdue and soon-due open tasks only', () => {
    expect(deadlineUrgency(task({ dueAt: hours(-1) }), now)).toBe('overdue');
    expect(deadlineUrgency(task({ dueAt: hours(23) }), now)).toBe('soon');
    expect(deadlineUrgency(task({ dueAt: hours(25) }), now)).toBeNull();
    expect(deadlineUrgency(task({ dueAt: hours(-1), column: 'done' }), now)).toBeNull();
    expect(deadlineUrgency(task(), now)).toBeNull();
  });
});

describe('quick categories', () => {
  const assigned = task({ id: 'assigned', assigneeIds: [other, me] });
  const authored = task({ id: 'authored', authorId: me, assigneeIds: [other] });
  const watched = task({ id: 'watched', assigneeIds: [other] });
  const unassignedOpen = task({ id: 'open' });
  const unassignedDone = task({ id: 'closed', column: 'done' });
  const unrelated = task({ id: 'unrelated', assigneeIds: [other] });
  const all = [assigned, authored, watched, unassignedOpen, unassignedDone, unrelated];
  const involved = involvedTaskIds({ watching: ['watched'], commented: [], mentioned: [] });
  const ids = (scope: TaskFilters['scope']) =>
    filterTasks(all, filters({ scope }), context({ involved })).map((item) => item.id);

  test('assigned to you and authored by you', () => {
    expect(ids('assigned')).toEqual(['assigned']);
    expect(ids('authored')).toEqual(['authored']);
  });

  test('involves you adds watched, commented and mentioned tasks', () => {
    expect(ids('involves')).toEqual(['assigned', 'authored', 'watched']);
    const commented = involvedTaskIds({ watching: [], commented: ['unrelated'], mentioned: ['x'] });
    expect(matchesScope(unrelated, 'involves', context({ involved: commented }))).toBe(true);
  });

  test('relevant adds open tasks nobody is assigned to', () => {
    expect(ids('relevant')).toEqual(['assigned', 'authored', 'watched', 'open']);
  });

  test('without a signed-in user, personal categories match nothing', () => {
    expect(matchesScope(task({ authorId: '' }), 'authored', context({ userId: '' }))).toBe(false);
    expect(matchesScope(watched, 'involves', context({ userId: '', involved }))).toBe(false);
  });
});

describe('combined filters', () => {
  const items = [
    task({ id: 'a', assigneeIds: ['ann'], labels: ['bug'], dueAt: hours(2) }),
    task({ id: 'b', assigneeIds: ['bob'], labels: ['docs'], dueAt: hours(-2) }),
    task({ id: 'c', labels: ['bug', 'docs'] }),
    task({ id: 'd', assigneeIds: ['ann', 'bob'] })
  ];
  const ids = (state: Partial<TaskFilters>) =>
    filterTasks(items, filters(state), context()).map((item) => item.id);

  test('values inside a facet combine with OR', () => {
    expect(ids({ assignees: ['ann', 'bob'] })).toEqual(['a', 'b', 'd']);
    expect(ids({ assignees: ['bob'], unassigned: true })).toEqual(['b', 'c', 'd']);
    expect(ids({ labels: ['docs'] })).toEqual(['b', 'c']);
    expect(ids({ labels: ['bug'], unlabeled: true })).toEqual(['a', 'c', 'd']);
  });

  test('facets combine with AND', () => {
    expect(ids({ assignees: ['ann'], labels: ['bug'] })).toEqual(['a']);
    expect(ids({ labels: ['docs'], deadline: 'overdue' })).toEqual(['b']);
    expect(ids({ assignees: ['ann'], deadline: 'undated', query: 'task' })).toEqual(['d']);
    expect(matchesTaskFilters(items[0], filters({ labels: ['docs'] }), context())).toBe(false);
  });

  test('no active filter returns the original list', () => {
    expect(filterTasks(items, filters(), context())).toBe(items);
  });
});

describe('label maintenance', () => {
  test('renaming or deleting a board label updates the active filter', () => {
    const state = filters({ labels: ['bug', 'docs'] });
    expect(renameFilterLabel(state, 'bug', 'defect').labels).toEqual(['defect', 'docs']);
    expect(renameFilterLabel(state, 'bug', 'docs').labels).toEqual(['docs']);
    expect(renameFilterLabel(state, 'docs', null).labels).toEqual(['bug']);
    expect(renameFilterLabel(state, 'other', null)).toBe(state);
  });
});
