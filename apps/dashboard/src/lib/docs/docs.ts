import { headingSlug, type DocHeading, type WordSegment } from 'shared/docs';
import type { MarkdownBlock } from 'shared/markdown';

export type Person = { id: string; name: string; image: string | null };
export type DocAccess = { canPropose: boolean; canReview: boolean; canPublish: boolean };
export type DocSummary = {
  id: string;
  slug: string;
  title: string;
  public: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  excerpt: string;
  contributors: Person[];
};
export type DocIndex = { access: DocAccess; pendingSuggestions: number; pages: DocSummary[] };
export type Contribution = {
  user: Person;
  revisions: number;
  pages: number;
  additions: number;
  deletions: number;
  lastContributionAt: string;
};
export type DocDetail = Omit<DocSummary, 'excerpt' | 'contributors'> & {
  projectId: string | null;
  markdown: string;
  access: DocAccess;
  blocks: MarkdownBlock[];
  headings: DocHeading[];
  createdByUser: Person | null;
  updatedByUser: Person | null;
  contributors: Contribution[];
  pendingSuggestions: number;
};
export type DocRevision = {
  id: string;
  version: number;
  title: string;
  public: boolean;
  reason: string;
  additions: number;
  deletions: number;
  proposalId: string | null;
  createdAt: string;
  author: Person | null;
  reviewer: Person | null;
};
export type SuggestionSummary = {
  id: string;
  pageId: string | null;
  pageTitle: string | null;
  pageSlug: string | null;
  title: string;
  reason: string;
  state: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  public: boolean;
  visibilityChange: boolean;
  outdated: boolean;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  author: Person | null;
  reviewer: Person | null;
  additions: number;
  deletions: number;
};
export type DiffRow = {
  kind: 'same' | 'changed' | 'removed' | 'added';
  beforeSource: string | null;
  afterSource: string | null;
  before: MarkdownBlock[] | null;
  after: MarkdownBlock[] | null;
  words: { before: WordSegment[]; after: WordSegment[] } | null;
};
export type DocDiffResult = { additions: number; deletions: number; rows: DiffRow[] };
export type SuggestionDetail = {
  id: string;
  projectId: string | null;
  pageId: string | null;
  slug: string | null;
  baseVersion: number | null;
  title: string;
  markdown: string;
  public: boolean;
  reason: string;
  state: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  author: Person | null;
  reviewer: Person | null;
  page: {
    id: string;
    slug: string;
    title: string;
    markdown: string;
    public: boolean;
    version: number;
  } | null;
  baseMarkdown: string | null;
  outdated: boolean;
  access: DocAccess;
  isAuthor: boolean;
};
export type DocInsights = {
  pages: number;
  revisions: number;
  contributors: (Contribution & { accepted: number; pending: number; rejected: number })[];
};
export type DocsView =
  | 'index'
  | 'new'
  | 'suggestions'
  | 'suggestion'
  | 'contributors'
  | 'page'
  | 'edit'
  | 'history';

/** Classifies the path below a workspace's docs; null when no such view exists. */
export function docsView(path: string[]): DocsView | null {
  const [first, second, third, ...rest] = path;
  if (rest.length || path.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) return null;
  if (!first) return 'index';
  if (first === 'new') return second ? null : 'new';
  if (first === 'contributors') return second ? null : 'contributors';
  if (first === 'suggestions') return third ? null : second ? 'suggestion' : 'suggestions';
  if (!second) return 'page';
  if (second === 'edit') return third ? null : 'edit';
  if (second === 'history' && (!third || /^\d+$/.test(third))) return 'history';
  return null;
}

export async function docsRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let result: { code?: string } = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    /* Error pages without JSON fall back to the status code. */
  }
  if (!response.ok) throw new Error(result.code ?? `${response.status}`);
  return result as T;
}

export const errorCode = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'REQUEST_FAILED';

export const workspaceQuery = (projectId: string) =>
  projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';

/** Suggests a page address from its title while the author has not chosen one. */
export const slugFromTitle = (title: string) => (/[a-z0-9]/i.test(title) ? headingSlug(title) : '');
