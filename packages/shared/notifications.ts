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
      description = pl ? 'dodaje komentarz' : 'commented';
      break;
    case 'comments.edited':
      description = pl ? 'edytuje komentarz' : 'edited a comment';
      break;
    case 'kanban.created':
      description = pl ? 'tworzy zadanie' : 'created a task';
      break;
    case 'threads.created':
      description = pl ? 'rozpoczyna dyskusję' : 'started a discussion';
      break;
    case 'threads.archived':
      description = pl ? 'archiwizuje dyskusję' : 'archived the discussion';
      break;
    case 'threads.restored':
      description = pl ? 'przywraca dyskusję' : 'reopened the discussion';
      break;
    case 'threads.assignees.updated':
      description = pl ? 'zmienia przypisane osoby' : 'changed the assignees';
      break;
    case 'threads.access.updated':
      description = pl ? 'zmienia dostęp do dyskusji' : 'changed who can access the discussion';
      break;
    default:
      if (action === 'kanban.updated' || action === 'threads.updated') {
        if (fields.length === 1 && fields[0] === 'title') {
          description = pl ? 'zmienia tytuł' : 'changed the title';
        } else if (fields.includes('column')) {
          description = pl ? 'zmienia status zadania' : 'changed the task status';
        } else if (fields.length === 1 && fields[0] === 'assigneeIds') {
          description = pl ? 'zmienia przypisane osoby' : 'changed the assignees';
        } else if (fields.length === 1 && fields[0] === 'markdown') {
          description = pl ? 'edytuje opis' : 'edited the description';
        }
      }
      description ??=
        notification.ownerType === 'thread'
          ? pl
            ? 'aktualizuje dyskusję'
            : 'updated the discussion'
          : pl
            ? 'aktualizuje zadanie'
            : 'updated the task';
  }
  return `${actor} ${description}`;
}
