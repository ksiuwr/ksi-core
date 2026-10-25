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
      description = pl ? 'dodał komentarz' : 'commented';
      break;
    case 'comments.edited':
      description = pl ? 'edytował komentarz' : 'edited a comment';
      break;
    case 'kanban.created':
      description = pl ? 'utworzył zadanie' : 'created a task';
      break;
    case 'threads.created':
      description = pl ? 'rozpoczął dyskusję' : 'started a discussion';
      break;
    case 'threads.archived':
      description = pl ? 'zarchiwizował dyskusję' : 'archived the discussion';
      break;
    case 'threads.restored':
      description = pl ? 'przywrócił dyskusję' : 'reopened the discussion';
      break;
    case 'threads.assignees.updated':
      description = pl ? 'zmienił przypisane osoby' : 'changed the assignees';
      break;
    case 'threads.access.updated':
      description = pl ? 'zmienił dostęp do dyskusji' : 'changed who can access the discussion';
      break;
    default:
      if (action === 'kanban.updated' || action === 'threads.updated') {
        if (fields.length === 1 && fields[0] === 'title') {
          description = pl ? 'zmienił tytuł' : 'changed the title';
        } else if (fields.includes('column')) {
          description = pl ? 'zmienił status zadania' : 'changed the task status';
        } else if (fields.length === 1 && fields[0] === 'assigneeIds') {
          description = pl ? 'zmienił przypisane osoby' : 'changed the assignees';
        } else if (fields.length === 1 && fields[0] === 'markdown') {
          description = pl ? 'edytował opis' : 'edited the description';
        }
      }
      description ??=
        notification.ownerType === 'thread'
          ? pl
            ? 'zaktualizował dyskusję'
            : 'updated the discussion'
          : pl
            ? 'zaktualizował zadanie'
            : 'updated the task';
  }
  return `${actor} ${description}`;
}
