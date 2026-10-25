export type NotificationContext = {
  actorName: string | null;
  action: string;
  ownerType: string;
  projectName: string | null;
  changedFields: string[];
};

/** Describe the event separately from why its recipient was notified. */
export function notificationAction(
  notification: Partial<NotificationContext>,
  language: 'pl' | 'en'
): string {
  const pl = language === 'pl';
  const actor = notification.actorName || (pl ? 'Ktoś' : 'Someone');
  const action = notification.action ?? '';
  const fields = notification.changedFields ?? [];
  let description: string;
  switch (action) {
    case 'kanban.comment.created':
    case 'threads.comment.created':
      description = pl ? 'Dodano komentarz' : 'commented';
      break;
    case 'comments.edited':
      description = pl ? 'Edytowano komentarz' : 'edited a comment';
      break;
    case 'kanban.created':
      description = pl ? 'Utworzono zadanie' : 'created a task';
      break;
    case 'threads.created':
      description = pl ? 'Rozpoczęto dyskusję' : 'started a discussion';
      break;
    case 'threads.archived':
      description = pl ? 'Zarchiwizowano dyskusję' : 'archived the discussion';
      break;
    case 'threads.restored':
      description = pl ? 'Przywrócono dyskusję' : 'reopened the discussion';
      break;
    case 'threads.assignees.updated':
      description = pl ? 'Zmieniono przypisane osoby' : 'changed the assignees';
      break;
    case 'threads.access.updated':
      description = pl ? 'Zmieniono dostęp do dyskusji' : 'changed who can access the discussion';
      break;
    default:
      if (action === 'kanban.updated' || action === 'threads.updated') {
        if (fields.length === 1 && fields[0] === 'title') {
          description = pl ? 'Zmieniono tytuł' : 'changed the title';
        } else if (fields.includes('column')) {
          description = pl ? 'Zmieniono status zadania' : 'changed the task status';
        } else if (fields.length === 1 && fields[0] === 'assigneeIds') {
          description = pl ? 'Zmieniono przypisane osoby' : 'changed the assignees';
        } else if (fields.length === 1 && fields[0] === 'markdown') {
          description = pl ? 'Edytowano opis' : 'edited the description';
        }
      }
      description ??=
        notification.ownerType === 'thread'
          ? pl
            ? 'Zaktualizowano dyskusję'
            : 'updated the discussion'
          : pl
            ? 'Zaktualizowano zadanie'
            : 'updated the task';
  }
  return pl ? `${description} · ${actor}` : `${actor} ${description}`;
}
