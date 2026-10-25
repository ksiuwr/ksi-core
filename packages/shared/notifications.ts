export type NotificationContext = {
  actorName: string | null;
  action: string;
  ownerType: string;
  projectName: string | null;
  changedFields: string[];
  assignedNames: (string | null)[];
  unassignedNames: (string | null)[];
};

/** Read assignment differences from the event rather than the task's current state. */
export function assignmentChanges(changes: unknown): { added: string[]; removed: string[] } {
  const change = Array.isArray(changes)
    ? changes.find((entry) => entry && entry.field === 'assigneeIds')
    : undefined;
  const ids = (value: unknown): string[] =>
    Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string'))]
      : [];
  const before = ids(change?.before),
    after = ids(change?.after);
  return {
    added: after.filter((id) => !before.includes(id)),
    removed: before.filter((id) => !after.includes(id))
  };
}

/** Describe the event separately from why its recipient was notified. */
export function notificationAction(
  notification: Partial<NotificationContext>,
  language: 'pl' | 'en'
): string {
  const pl = language === 'pl';
  const actor = notification.actorName || (pl ? 'Ktoś' : 'Someone');
  const action = notification.action ?? '';
  const fields = notification.changedFields ?? [];
  const names = (values: (string | null)[] = []) =>
    values.map((name) => name || (pl ? 'Nieznany użytkownik' : 'Unknown user')).join(', ');
  const assignments: string[] = [];
  if (notification.assignedNames?.length)
    assignments.push(`${pl ? 'przypisał:' : 'assigned'} ${names(notification.assignedNames)}`);
  if (notification.unassignedNames?.length)
    assignments.push(
      `${pl ? 'cofnął przypisanie:' : 'unassigned'} ${names(notification.unassignedNames)}`
    );
  if (
    assignments.length &&
    [
      'kanban.created',
      'kanban.updated',
      'threads.created',
      'threads.updated',
      'threads.assignees.updated'
    ].includes(action)
  ) {
    const created =
      action === 'kanban.created'
        ? pl
          ? 'utworzył zadanie; '
          : 'created a task and '
        : action === 'threads.created'
          ? pl
            ? 'rozpoczął dyskusję; '
            : 'started a discussion and '
          : '';
    return `${actor} ${created}${assignments.join(pl ? '; ' : ' and ')}`;
  }
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
