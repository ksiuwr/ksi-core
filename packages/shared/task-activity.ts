import { hasContentChange, type ContentChange } from './activity';

export type TaskActivitySummary =
  | { kind: 'created' | 'description' | 'deleted' | 'restored' | 'updated' }
  | { kind: 'renamed' | 'moved'; before: string; after: string }
  | { kind: 'label-added' | 'label-removed'; labels: string[] }
  | { kind: 'label-renamed'; before: string; after: string }
  | { kind: 'label-color'; label: string; before: string; after: string }
  | { kind: 'label-description'; label: string; operation: 'added' | 'changed' | 'removed' };

/** Summarize meaningful edits without putting task descriptions into the discussion feed. */
export function taskActivitySummary(
  action: string,
  changes: ContentChange[] | null
): TaskActivitySummary[] {
  if (action === 'kanban.created') return [{ kind: 'created' }];
  if (action === 'kanban.tombstoned') return [{ kind: 'deleted' }];
  if (action === 'kanban.restored') return [{ kind: 'restored' }];
  const result: TaskActivitySummary[] = [];
  for (const change of changes ?? []) {
    if (!change || !hasContentChange(change.before, change.after)) continue;
    if (change.field === 'title' && typeof change.after === 'string')
      result.push({
        kind: 'renamed',
        before: typeof change.before === 'string' ? change.before : '',
        after: change.after
      });
    if (change.field === 'markdown') result.push({ kind: 'description' });
    if (change.field === 'column' && typeof change.after === 'string')
      result.push({
        kind: 'moved',
        before: typeof change.before === 'string' ? change.before : '',
        after: change.after
      });
    if (
      change.field === 'label' &&
      change.before &&
      change.after &&
      typeof change.before === 'object' &&
      typeof change.after === 'object'
    ) {
      const before = change.before as Record<string, unknown>,
        after = change.after as Record<string, unknown>;
      if (typeof before.name === 'string' && typeof after.name === 'string') {
        if (before.name !== after.name)
          result.push({ kind: 'label-renamed', before: before.name, after: after.name });
        const oldColor = typeof before.color === 'string' ? before.color : '#6b7280';
        const newColor = typeof after.color === 'string' ? after.color : '#6b7280';
        if (oldColor.toLowerCase() !== newColor.toLowerCase())
          result.push({
            kind: 'label-color',
            label: after.name,
            before: oldColor,
            after: newColor
          });
        if (hasContentChange(before.description, after.description))
          result.push({
            kind: 'label-description',
            label: after.name,
            operation: !after.description ? 'removed' : !before.description ? 'added' : 'changed'
          });
      }
    }
    if (change.field === 'labels') {
      const names = (value: unknown) =>
        new Set(
          Array.isArray(value)
            ? value.filter((name): name is string => typeof name === 'string')
            : []
        );
      const before = names(change.before),
        after = names(change.after);
      const added = [...after].filter((name) => !before.has(name));
      const removed = [...before].filter((name) => !after.has(name));
      if (added.length) result.push({ kind: 'label-added', labels: added });
      if (removed.length) result.push({ kind: 'label-removed', labels: removed });
    }
  }
  return result.length ? result : [{ kind: 'updated' }];
}
