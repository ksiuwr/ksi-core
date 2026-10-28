import type { ContentChange } from 'shared/activity';
import type { ContentTranslations } from 'shared/content-locales';
import type { Profile } from 'shared/types';

export type InboxData = {
  memberships: { id: string; name: string; email: string; createdAt: string }[];
  avatars: { userId: string; name: string; fileId: string; version: number; createdAt: string }[];
};

export type Workspace = 'directory' | 'project' | 'association';

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: number;
  locked: boolean;
  tags: string[];
  fields: string[];
};

export type ProjectAccess = {
  isMember: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canManageGroups: boolean;
  canReadPreviewCredentials: boolean;
  canProposeArticles: boolean;
  canPublishArticles: boolean;
  canEditAnyArticles: boolean;
};

export const emptyProjectAccess: ProjectAccess = {
  isMember: false,
  canEdit: false,
  canManageMembers: false,
  canManageGroups: false,
  canReadPreviewCredentials: false,
  canProposeArticles: false,
  canPublishArticles: false,
  canEditAnyArticles: false
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  thumbnailFileId: string | null;
  version: number;
  state: string;
  translations?: ContentTranslations;
  mainArticle: boolean;
  projectId: string | null;
  createdBy?: string;
  projectFeed: boolean;
  websiteFeed: boolean;
  publicCredit?: boolean;
  canManageCredit?: boolean;
};

export type BoardStatus = { id: string; name: string; color?: string; deleted?: boolean };
export type BoardLabel = { name: string; color?: string; description?: string };

export type Item = {
  id: string;
  title: string;
  markdown: string;
  column: string;
  version: number;
  position: number;
  labels: string[];
  assigneeIds?: string[];
  dueAt?: string | null;
  referenceNumber?: number | null;
  deletedAt?: string;
  authorId?: string;
  createdAt?: string;
};

export type Comment = {
  id: string;
  markdown: string;
  createdAt: string;
  authorName?: string;
  authorId?: string;
  edited?: boolean;
};

export type Thread = {
  assigneeIds?: string[];
  id: string;
  title: string;
  visibility: string;
  projectId?: string | null;
  referenceNumber?: number | null;
  authorId?: string;
  archivedAt?: string | null;
  version: number;
  createdAt?: string;
  comments?: Comment[];
};

export type ThreadEvent = {
  id: string;
  action: string;
  createdAt: string;
  targetId: string;
  authorName: string | null;
  authorId: string | null;
  metadata: { changes: ContentChange[] | null };
};

export type ActivityEvent = {
  event: {
    id: string;
    action: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
    actorId: string | null;
    targetId: string;
  };
  actorName: string | null;
  firstName: string | null;
  lastName: string | null;
  projectSlug: string | null;
};

export type AssignmentMember = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  image?: string | null;
  bio?: string | null;
  role?: string;
  leader?: boolean;
};

export type BoardData = {
  id: string;
  statuses: BoardStatus[];
  labels: (string | BoardLabel)[];
};

export type TaskDetailData = {
  item: Item;
  board: BoardData | null;
  items: Item[];
  members: AssignmentMember[];
  comments: Comment[];
  activity: ThreadEvent[];
  activityNextPage: number | null;
};

export type ThreadDetailData = {
  thread: Thread;
  members: AssignmentMember[];
  events: ThreadEvent[];
  eventsNextPage: number | null;
  eventsError: boolean;
};

export type PageUser = Profile;
export type PageInbox = InboxData;

export const defaultStatuses: BoardStatus[] = [
  { id: 'todo', name: 'To do' },
  { id: 'progress', name: 'In progress' },
  { id: 'done', name: 'Done' }
];
