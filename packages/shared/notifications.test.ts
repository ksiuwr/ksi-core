import { describe, expect, test } from 'bun:test';
import { notificationAction, assignmentChanges } from './notifications';

describe('notification action descriptions', () => {
  test('comments describe the actor and actual event, including when a mention triggered delivery', () => {
    const notification = {
      actorName: 'Alicja Nowak',
      action: 'threads.comment.created',
      reason: 'mention',
      ownerType: 'thread'
    };
    expect(notificationAction(notification, 'en-us')).toBe('Alicja Nowak commented');
    expect(notificationAction(notification, 'pl')).toBe('Alicja Nowak dodał komentarz');
    expect(notificationAction({ ...notification, action: 'comments.edited' }, 'en-us')).toBe(
      'Alicja Nowak edited a comment'
    );
  });
  test('task updates distinguish titles, status, descriptions, and assignments', () => {
    const notification = { actorName: 'Jan', action: 'kanban.updated', ownerType: 'item' };
    expect(notificationAction({ ...notification, changedFields: ['title'] }, 'en-us')).toBe(
      'Jan changed the title'
    );
    expect(
      notificationAction({ ...notification, changedFields: ['column', 'position'] }, 'en-us')
    ).toBe('Jan changed the task status');
    expect(notificationAction({ ...notification, changedFields: ['markdown'] }, 'pl')).toBe(
      'Jan edytował opis'
    );
    expect(notificationAction({ ...notification, changedFields: ['assigneeIds'] }, 'pl')).toBe(
      'Jan zmienił przypisane osoby'
    );
    expect(
      notificationAction({ ...notification, changedFields: ['title', 'markdown'] }, 'en-us')
    ).toBe('Jan updated the task');
  });
  test('discussion events preserve the action and handle missing actors', () => {
    expect(notificationAction({ action: 'threads.archived', actorName: 'Jan' }, 'en-us')).toBe(
      'Jan archived the discussion'
    );
    expect(notificationAction({ action: 'threads.access.updated', actorName: 'Jan' }, 'pl')).toBe(
      'Jan zmienił dostęp do dyskusji'
    );
    expect(notificationAction({ action: 'threads.created', actorName: null }, 'pl')).toBe(
      'Ktoś rozpoczął dyskusję'
    );
    expect(notificationAction({ action: 'unknown', ownerType: 'thread' }, 'en-us')).toBe(
      'Someone updated the discussion'
    );
  });
});

test('assignment changes distinguish additions and removals without treating reorder as reassignment', () => {
  expect(
    assignmentChanges([{ field: 'assigneeIds', before: ['a', 'b'], after: ['b', 'c'] }])
  ).toEqual({ added: ['c'], removed: ['a'] });
  expect(
    assignmentChanges([{ field: 'assigneeIds', before: ['a', 'b'], after: ['b', 'a'] }])
  ).toEqual({ added: [], removed: [] });
  expect(assignmentChanges([{ field: 'assigneeIds', before: null, after: ['a', 'a'] }])).toEqual({
    added: ['a'],
    removed: []
  });
  expect(assignmentChanges(undefined)).toEqual({ added: [], removed: [] });
});

test('assignment descriptions name assigned and unassigned people in both languages', () => {
  const context = {
    actorName: 'Jan',
    action: 'kanban.updated',
    changedFields: ['assigneeIds'],
    assignedNames: ['Alicja', 'Piotr'],
    unassignedNames: ['Marek']
  };
  expect(notificationAction(context, 'en-us')).toBe(
    'Jan assigned Alicja, Piotr and unassigned Marek'
  );
  expect(notificationAction(context, 'pl')).toBe(
    'Jan przypisał: Alicja, Piotr; cofnął przypisanie: Marek'
  );
  expect(notificationAction({ ...context, assignedNames: [] }, 'en-us')).toBe(
    'Jan unassigned Marek'
  );
  expect(notificationAction({ ...context, assignedNames: [], unassignedNames: [null] }, 'pl')).toBe(
    'Jan cofnął przypisanie: Nieznany użytkownik'
  );
  expect(
    notificationAction({ ...context, action: 'kanban.created', unassignedNames: [] }, 'en-us')
  ).toBe('Jan created a task and assigned Alicja, Piotr');
});
