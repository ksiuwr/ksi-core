export type ContentChange = { field: string; before: unknown; after: unknown };

/** Explicit field lists prevent account credentials from entering audit metadata. */
export function contentChanges(
  before: object,
  after: object,
  fields: readonly string[]
): ContentChange[] {
  const previous = before as Record<string, unknown>,
    next = after as Record<string, unknown>;
  return fields.flatMap((field) =>
    JSON.stringify(previous[field] ?? null) === JSON.stringify(next[field] ?? null)
      ? []
      : [{ field, before: previous[field] ?? null, after: next[field] ?? null }]
  );
}
export const taskChangeFields = [
  'title',
  'markdown',
  'column',
  'tags',
  'assigneeIds',
  'dueAt'
] as const;
