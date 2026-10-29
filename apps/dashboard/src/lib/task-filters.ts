/**
 * Kanban task filtering. Everything here is pure so the board, the URL and the
 * unit tests share one definition of what each filter means. UI copy lives in
 * the Svelte components (Wuchale only extracts strings from there).
 */

/** Status id the board treats as completed (overdue styling, deadline reminders). */
export const DONE_STATUS = 'done';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Open tasks due within this window are highlighted as due soon. */
export const DUE_SOON_MS = DAY;

export const taskScopes = ['assigned', 'authored', 'involves', 'relevant'] as const;
export type TaskScope = (typeof taskScopes)[number];

export const deadlineFilters = ['overdue', 'today', 'week', 'month', 'dated', 'undated'] as const;
export type DeadlineFilter = (typeof deadlineFilters)[number];

export type TaskFilters = {
  /** Free text; every whitespace-separated term must match. */
  query: string;
  scope: TaskScope | null;
  /** Matches tasks assigned to any of these people. */
  assignees: string[];
  /** Also match tasks without assignees. */
  unassigned: boolean;
  /** Matches tasks carrying any of these labels. */
  labels: string[];
  /** Also match tasks without labels. */
  unlabeled: boolean;
  deadline: DeadlineFilter | null;
};

export type FilterableTask = {
  id: string;
  title: string;
  markdown: string;
  column: string;
  labels: string[];
  assigneeIds?: string[];
  dueAt?: string | null;
  referenceNumber?: number | null;
  authorId?: string;
};

/** Per-user activity the board data does not carry; served by `/boards/:id/involvement`. */
export type TaskInvolvement = {
  watching: string[];
  commented: string[];
  mentioned: string[];
};

export type FilterContext = {
  userId: string;
  now: number;
  /** Ids of tasks the user watches, commented on, or is mentioned in. */
  involved?: ReadonlySet<string>;
};

export const emptyTaskFilters: Readonly<TaskFilters> = {
  query: '',
  scope: null,
  assignees: [],
  unassigned: false,
  labels: [],
  unlabeled: false,
  deadline: null
};

/** URL search parameter names. Multi-value filters repeat their parameter. */
export const filterParams = {
  query: 'q',
  scope: 'scope',
  assignee: 'assignee',
  unassigned: 'unassigned',
  label: 'label',
  unlabeled: 'unlabeled',
  deadline: 'due'
} as const;

const ownParams: string[] = Object.values(filterParams);

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | null =>
  value !== null && (values as readonly string[]).includes(value) ? (value as T) : null;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const flag = (params: URLSearchParams, name: string) => {
  const value = params.get(name);
  return value !== null && value !== '0' && value !== 'false';
};

/** Read filters from URL search params, ignoring unknown or malformed values. */
export function parseTaskFilters(params: URLSearchParams): TaskFilters {
  return {
    query: params.get(filterParams.query) ?? '',
    scope: oneOf(taskScopes, params.get(filterParams.scope)),
    assignees: unique(params.getAll(filterParams.assignee)),
    unassigned: flag(params, filterParams.unassigned),
    labels: unique(params.getAll(filterParams.label)),
    unlabeled: flag(params, filterParams.unlabeled),
    deadline: oneOf(deadlineFilters, params.get(filterParams.deadline))
  };
}

/**
 * Write filters into a copy of `base`, keeping unrelated parameters and
 * omitting defaults so an unfiltered board has a clean URL.
 */
export function writeTaskFilters(base: URLSearchParams, filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of base) if (!ownParams.includes(key)) params.append(key, value);
  if (filters.query.trim()) params.set(filterParams.query, filters.query);
  if (filters.scope) params.set(filterParams.scope, filters.scope);
  for (const id of unique(filters.assignees)) params.append(filterParams.assignee, id);
  if (filters.unassigned) params.set(filterParams.unassigned, '1');
  for (const name of unique(filters.labels)) params.append(filterParams.label, name);
  if (filters.unlabeled) params.set(filterParams.unlabeled, '1');
  if (filters.deadline) params.set(filterParams.deadline, filters.deadline);
  return params;
}

/** Number of independent filters in effect (each facet counts once). */
export function activeFilterCount(filters: TaskFilters): number {
  return [
    !!filters.query.trim(),
    !!filters.scope,
    filters.assignees.length > 0 || filters.unassigned,
    filters.labels.length > 0 || filters.unlabeled,
    !!filters.deadline
  ].filter(Boolean).length;
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return activeFilterCount(filters) > 0;
}

/** Case-, accent- and Polish-ł-insensitive form used for text search. */
export function normalizeSearchText(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l');
}

export function searchTerms(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/**
 * Every term must occur in the title, description, label names or reference.
 * A `#12` term matches reference number 12 exactly.
 */
export function matchesQuery(task: FilterableTask, query: string): boolean {
  const terms = searchTerms(query);
  if (!terms.length) return true;
  const reference = task.referenceNumber ? `#${task.referenceNumber}` : '';
  const haystack = normalizeSearchText(
    [task.title, task.markdown, ...task.labels, reference].join('\n')
  );
  return terms.every((term) =>
    /^#\d+$/.test(term) ? term === reference : haystack.includes(term)
  );
}

const isDone = (task: FilterableTask) => task.column === DONE_STATUS;
const dueTime = (task: FilterableTask) => {
  if (!task.dueAt) return null;
  const time = new Date(task.dueAt).getTime();
  return Number.isNaN(time) ? null : time;
};

/** Local calendar day containing `now`, as a half-open [start, end) range. */
export function localDayRange(now: number): [number, number] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

/**
 * Deadline windows. `overdue` excludes completed tasks; the forward-looking
 * windows start now, so passed deadlines only appear under `overdue`.
 */
export function matchesDeadline(
  task: FilterableTask,
  deadline: DeadlineFilter | null,
  now: number
): boolean {
  if (!deadline) return true;
  const due = dueTime(task);
  if (deadline === 'undated') return due === null;
  if (due === null) return false;
  switch (deadline) {
    case 'dated':
      return true;
    case 'overdue':
      return due < now && !isDone(task);
    case 'today': {
      const [start, end] = localDayRange(now);
      return due >= start && due < end;
    }
    case 'week':
      return due >= now && due < now + 7 * DAY;
    case 'month':
      return due >= now && due < now + 30 * DAY;
  }
}

/** Urgency of a task's deadline for card styling; completed tasks are never urgent. */
export function deadlineUrgency(task: FilterableTask, now: number): 'overdue' | 'soon' | null {
  const due = dueTime(task);
  if (due === null || isDone(task)) return null;
  if (due < now) return 'overdue';
  return due - now <= DUE_SOON_MS ? 'soon' : null;
}

export function involvedTaskIds(involvement?: TaskInvolvement | null): Set<string> {
  if (!involvement) return new Set();
  return new Set([...involvement.watching, ...involvement.commented, ...involvement.mentioned]);
}

export const isAssignedTo = (task: FilterableTask, userId: string) =>
  !!userId && (task.assigneeIds ?? []).includes(userId);
export const isAuthoredBy = (task: FilterableTask, userId: string) =>
  !!userId && task.authorId === userId;

/**
 * - assigned: the user is one of the assignees.
 * - authored: the user created the task.
 * - involves: assigned, authored, or the user watches, commented on, or is
 *   mentioned in the task (description or comments).
 * - relevant: involves the user, or is an open task nobody is assigned to yet.
 */
export function matchesScope(
  task: FilterableTask,
  scope: TaskScope | null,
  context: FilterContext
): boolean {
  if (!scope) return true;
  const { userId } = context;
  if (scope === 'assigned') return isAssignedTo(task, userId);
  if (scope === 'authored') return isAuthoredBy(task, userId);
  const involves =
    isAssignedTo(task, userId) ||
    isAuthoredBy(task, userId) ||
    (!!userId && !!context.involved?.has(task.id));
  if (scope === 'involves') return involves;
  return involves || (!task.assigneeIds?.length && !isDone(task));
}

export function matchesAssignees(task: FilterableTask, filters: TaskFilters): boolean {
  if (!filters.assignees.length && !filters.unassigned) return true;
  const assignees = task.assigneeIds ?? [];
  if (filters.unassigned && !assignees.length) return true;
  return assignees.some((id) => filters.assignees.includes(id));
}

export function matchesLabels(task: FilterableTask, filters: TaskFilters): boolean {
  if (!filters.labels.length && !filters.unlabeled) return true;
  if (filters.unlabeled && !task.labels.length) return true;
  return task.labels.some((name) => filters.labels.includes(name));
}

/** Facets combine with AND; values inside a multi-value facet combine with OR. */
export function matchesTaskFilters(
  task: FilterableTask,
  filters: TaskFilters,
  context: FilterContext
): boolean {
  return (
    matchesScope(task, filters.scope, context) &&
    matchesAssignees(task, filters) &&
    matchesLabels(task, filters) &&
    matchesDeadline(task, filters.deadline, context.now) &&
    matchesQuery(task, filters.query)
  );
}

export function filterTasks<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFilters,
  context: FilterContext
): T[] {
  if (!hasActiveFilters(filters)) return tasks;
  return tasks.filter((task) => matchesTaskFilters(task, filters, context));
}

/** Replace or drop a label in the filters after it is renamed or deleted on the board. */
export function renameFilterLabel(
  filters: TaskFilters,
  from: string,
  to: string | null
): TaskFilters {
  if (!filters.labels.includes(from)) return filters;
  const labels = filters.labels.flatMap((name) => (name === from ? (to ? [to] : []) : [name]));
  return { ...filters, labels: unique(labels) };
}
