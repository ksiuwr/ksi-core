import { hasContentChange, type ContentChange } from './activity';

export type ThreadActivitySummary =
  | {
      kind:
        | 'created'
        | 'archived'
        | 'restored'
        | 'access'
        | 'comment-added'
        | 'comment-edited'
        | 'comment-removed'
        | 'updated';
    }
  | { kind: 'visibility'; before: string; after: string }
  | { kind: 'invited'; count: number }
  | { kind: 'uninvited'; count: number };

/** Summarize forum events without putting comment bodies into the timeline. */
export function threadActivitySummary(
  action: string,
  changes: ContentChange[] | null
): ThreadActivitySummary[] {
  if (action === 'threads.created') return [{ kind: 'created' }];
  if (action === 'threads.archived') return [{ kind: 'archived' }];
  if (action === 'threads.restored') return [{ kind: 'restored' }];
  if (action === 'threads.comment.created') return [{ kind: 'comment-added' }];
  if (action === 'comments.edited') return [{ kind: 'comment-edited' }];
  if (action === 'comments.removed') return [{ kind: 'comment-removed' }];

  const result: ThreadActivitySummary[] = [];
  for (const change of changes ?? []) {
    if (!change || !hasContentChange(change.before, change.after)) continue;
    if (
      change.field === 'visibility' &&
      typeof change.before === 'string' &&
      typeof change.after === 'string'
    )
      result.push({ kind: 'visibility', before: change.before, after: change.after });
    if (change.field === 'invitedIds') {
      const ids = (value: unknown) =>
        new Set(
          Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
        );
      const before = ids(change.before),
        after = ids(change.after);
      const invited = [...after].filter((id) => !before.has(id)).length;
      const uninvited = [...before].filter((id) => !after.has(id)).length;
      if (invited) result.push({ kind: 'invited', count: invited });
      if (uninvited) result.push({ kind: 'uninvited', count: uninvited });
    }
  }
  if (action === 'threads.access.updated') return result.length ? result : [{ kind: 'access' }];
  return result.length ? result : [{ kind: 'updated' }];
}
