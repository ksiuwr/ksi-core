export type ContentChange = { field: string; before: unknown; after: unknown };

// PostgreSQL JSONB can return object keys in a different order.
function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, comparable(entry)])
    );
  }
  return value;
}

// Forms submit unset text as ""; collection fields also default to an empty list.
// These represent the same absent value shown in activity and revision views.
function comparisonValue(value: unknown): unknown {
  return value === '' || (Array.isArray(value) && value.length === 0)
    ? null
    : comparable(value ?? null);
}

export function hasContentChange(before: unknown, after: unknown): boolean {
  return JSON.stringify(comparisonValue(before)) !== JSON.stringify(comparisonValue(after));
}

/** Explicit field lists prevent account credentials from entering audit metadata. */
export function contentChanges(
  before: object,
  after: object,
  fields: readonly string[]
): ContentChange[] {
  const previous = before as Record<string, unknown>,
    next = after as Record<string, unknown>;
  return fields.flatMap((field) =>
    hasContentChange(previous[field], next[field])
      ? [{ field, before: previous[field] ?? null, after: next[field] ?? null }]
      : []
  );
}
export const taskChangeFields = [
  'title',
  'markdown',
  'column',
  'labels',
  'assigneeIds',
  'position'
] as const;
export const profileChangeFields = [
  'firstName',
  'lastName',
  'nickname',
  'bio',
  'github',
  'linkedin',
  'publicPrivacy'
] as const;
export const accessChangeFields = ['role', 'membershipStatus', 'flags'] as const;

export type ContentRevision = {
  id: string;
  createdAt: string;
  authorName: string | null;
  kind: 'created' | 'edited' | 'moved';
  changes: ContentChange[] | null;
};
export type ContentRevisionPage = { revisions: ContentRevision[]; nextPage: number | null };
