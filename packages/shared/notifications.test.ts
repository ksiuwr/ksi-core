import { describe, expect, test } from 'bun:test';
import { notificationAction } from './notifications';

describe('notification action descriptions', () => {
  test('comments describe the actor and actual event, including when a mention triggered delivery', () => {
    const notification = {
      actorName: 'Alicja Nowak',
      action: 'threads.comment.created',
      reason: 'mention',
      ownerType: 'thread'
    };
    expect(notificationAction(notification, 'en')).toBe('Alicja Nowak commented');
    expect(notificationAction(notification, 'pl')).toBe('Dodano komentarz · Alicja Nowak');
    expect(notificationAction({ ...notification, action: 'comments.edited' }, 'en')).toBe(
      'Alicja Nowak edited a comment'
    );
  });
  test('task updates distinguish titles, status, descriptions, and assignments', () => {
    const notification = { actorName: 'Jan', action: 'kanban.updated', ownerType: 'item' };
    expect(notificationAction({ ...notification, changedFields: ['title'] }, 'en')).toBe(
      'Jan changed the title'
    );
    expect(
      notificationAction({ ...notification, changedFields: ['column', 'position'] }, 'en')
    ).toBe('Jan changed the task status');
    expect(notificationAction({ ...notification, changedFields: ['markdown'] }, 'pl')).toBe(
      'Edytowano opis · Jan'
    );
    expect(notificationAction({ ...notification, changedFields: ['assigneeIds'] }, 'pl')).toBe(
      'Zmieniono przypisane osoby · Jan'
    );
    expect(
      notificationAction({ ...notification, changedFields: ['title', 'markdown'] }, 'en')
    ).toBe('Jan updated the task');
  });
  test('discussion events preserve the action and handle missing actors', () => {
    expect(notificationAction({ action: 'threads.archived', actorName: 'Jan' }, 'en')).toBe(
      'Jan archived the discussion'
    );
    expect(notificationAction({ action: 'threads.access.updated', actorName: 'Jan' }, 'pl')).toBe(
      'Zmieniono dostęp do dyskusji · Jan'
    );
    expect(notificationAction({ action: 'threads.created', actorName: null }, 'pl')).toBe(
      'Rozpoczęto dyskusję · Ktoś'
    );
    expect(notificationAction({ action: 'unknown', ownerType: 'thread' }, 'en')).toBe(
      'Someone updated the discussion'
    );
  });
});
