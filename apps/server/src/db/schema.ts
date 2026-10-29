import { sql } from 'drizzle-orm';
import type { ContentTranslations } from 'shared/content-locales';
import { defaultBoardStatuses, type BoardStatus } from '../domain/board-statuses';
import type { BoardLabel } from '../domain/board-labels';
import { createId } from '@paralleldrive/cuid2';
import {
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  snakeCase,
  jsonb,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('membership_status', [
  'pending',
  'active',
  'suspended',
  'deleted'
]);
export const memberRoleEnum = pgEnum('member_role', ['member', 'board', 'administrator']);
export const privacyEnum = pgEnum('public_privacy', ['full-name', 'last-initial', 'initials']);

export const users = snakeCase.table('users', {
  translations: jsonb().$type<ContentTranslations>().notNull().default({}),
  id: text().primaryKey().$defaultFn(createId),
  name: text().notNull(),
  firstName: text().notNull().default(''),
  lastName: text().notNull().default(''),
  nickname: text(),
  bio: text(),
  github: text(),
  linkedin: text(),
  publicPrivacy: privacyEnum().notNull().default('last-initial'),
  membershipStatus: membershipStatusEnum().notNull().default('pending'),
  role: memberRoleEnum().notNull().default('member'),
  flags: text().array().notNull().default([]),
  deletedAt: timestamp(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull()
});

export const sessions = snakeCase.table('sessions', {
  id: text().primaryKey().$defaultFn(createId),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
});

export const accounts = snakeCase.table('accounts', {
  id: text().primaryKey().$defaultFn(createId),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  password: text(),
  issuer: text(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$onUpdate(() => new Date())
    .notNull()
});

export const verifications = snakeCase.table('verifications', {
  id: text().primaryKey().$defaultFn(createId),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull()
});

export const alertStyleEnum = pgEnum('alert_color', ['neutral', 'info', 'warning', 'danger']);

export const alerts = snakeCase.table('alerts', {
  translations: jsonb().$type<ContentTranslations>().notNull().default({}),
  version: integer().notNull().default(1),
  id: text().primaryKey().$defaultFn(createId),
  priority: integer(),
  title: text().notNull(),
  description: text().notNull(),
  link: text(),
  color: alertStyleEnum().notNull(),
  startDate: timestamp().notNull(),
  endDate: timestamp().notNull(),
  createdBy: text().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp()
    .$defaultFn(() => new Date())
    .notNull()
});

export const projects = snakeCase.table('projects', {
  translations: jsonb().$type<ContentTranslations>().notNull().default({}),
  id: text().primaryKey().$defaultFn(createId),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(''),
  tags: text().array().notNull().default([]),
  fields: text().array().notNull().default([]),
  memberPermissions: text().array().notNull().default([]),
  nonMemberPermissions: text().array().notNull().default([]),
  locked: boolean().notNull().default(false),
  layout: jsonb()
    .$type<
      { type: 'leaders' | 'members' | 'main-article' | 'articles' | 'links'; hidden: boolean }[]
    >()
    .notNull()
    .default([]),
  version: integer().notNull().default(1),
  createdAt: timestamp().notNull().defaultNow()
});
export const projectMembers = snakeCase.table(
  'project_members',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text()
      .notNull()
      .references(() => projects.id),
    userId: text()
      .notNull()
      .references(() => users.id),
    leader: boolean().notNull().default(false),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('project_member_unique').on(t.projectId, t.userId)]
);
export const projectGroups = snakeCase.table(
  'project_groups',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    permissions: text().array().notNull().default([]),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('project_group_name_unique').on(t.projectId, t.name)]
);
export const projectGroupMembers = snakeCase.table(
  'project_group_members',
  {
    groupId: text()
      .notNull()
      .references(() => projectGroups.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('project_group_member_unique').on(t.groupId, t.userId)]
);
export const previewCredentials = snakeCase.table(
  'preview_credentials',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    previewId: text().notNull(),
    branch: text().notNull(),
    commit: text().notNull(),
    previewUrl: text().notNull(),
    accounts: text().notNull(),
    updatedAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('preview_credentials_project_preview_unique').on(t.projectId, t.previewId)]
);
export const joinRequests = snakeCase.table(
  'join_requests',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text()
      .notNull()
      .references(() => projects.id),
    userId: text()
      .notNull()
      .references(() => users.id),
    state: text().notNull().default('pending'),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('join_request_unique').on(t.projectId, t.userId)]
);
export const projectLinks = snakeCase.table('project_links', {
  translations: jsonb().$type<ContentTranslations>().notNull().default({}),
  id: text().primaryKey().$defaultFn(createId),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  label: text().notNull(),
  url: text().notNull(),
  position: integer().notNull().default(0)
});
export const articles = snakeCase.table('articles', {
  translations: jsonb().$type<ContentTranslations>().notNull().default({}),
  id: text().primaryKey().$defaultFn(createId),
  projectId: text().references(() => projects.id),
  slug: text().notNull().unique(),
  title: text().notNull(),
  markdown: text().notNull().default(''),
  thumbnailFileId: text().references(() => files.id),
  language: text().notNull().default('en'),
  state: text().notNull().default('draft'),
  mainArticle: boolean().notNull().default(false),
  projectFeed: boolean().notNull().default(false),
  websiteFeed: boolean().notNull().default(false),
  version: integer().notNull().default(1),
  createdBy: text()
    .notNull()
    .references(() => users.id),
  publishedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow()
});
export const articleRevisions = snakeCase.table(
  'article_revisions',
  {
    translations: jsonb().$type<ContentTranslations>().notNull().default({}),
    id: text().primaryKey().$defaultFn(createId),
    articleId: text()
      .notNull()
      .references(() => articles.id),
    version: integer().notNull(),
    title: text().notNull(),
    markdown: text().notNull(),
    thumbnailFileId: text().references(() => files.id),
    actorId: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('article_revision_unique').on(t.articleId, t.version)]
);
export const articleProposals = snakeCase.table('article_proposals', {
  id: text().primaryKey().$defaultFn(createId),
  articleId: text()
    .notNull()
    .references(() => articles.id),
  authorId: text()
    .notNull()
    .references(() => users.id),
  baseVersion: integer().notNull(),
  title: text().notNull(),
  markdown: text().notNull(),
  state: text().notNull().default('pending'),
  createdAt: timestamp().notNull().defaultNow()
});
export const articleContributors = snakeCase.table(
  'article_contributors',
  {
    id: text().primaryKey().$defaultFn(createId),
    articleId: text()
      .notNull()
      .references(() => articles.id),
    userId: text()
      .notNull()
      .references(() => users.id),
    publicCredit: boolean().notNull().default(false)
  },
  (t) => [uniqueIndex('article_contributor_unique').on(t.articleId, t.userId)]
);
export const boards = snakeCase.table('boards', {
  id: text().primaryKey().$defaultFn(createId),
  projectId: text().references(() => projects.id),
  scopeKey: text().notNull().unique(),
  labels: jsonb().$type<BoardLabel[]>().notNull().default([]),
  statuses: jsonb().$type<BoardStatus[]>().notNull().default(defaultBoardStatuses)
});
export const kanbanItems = snakeCase.table(
  'kanban_items',
  {
    referenceNumber: integer(),
    dueAt: timestamp(),
    assigneeIds: text().array().notNull().default([]),
    id: text().primaryKey().$defaultFn(createId),
    boardId: text()
      .notNull()
      .references(() => boards.id),
    title: text().notNull(),
    markdown: text().notNull().default(''),
    column: text().notNull().default('todo'),
    labels: text().array().notNull().default([]),
    position: integer().notNull().default(0),
    version: integer().notNull().default(1),
    deletedAt: timestamp(),
    authorId: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('kanban_board_reference_unique').on(t.boardId, t.referenceNumber)]
);
export const threads = snakeCase.table(
  'threads',
  {
    referenceNumber: integer(),
    assigneeIds: text().array().notNull().default([]),
    id: text().primaryKey().$defaultFn(createId),
    projectId: text().references(() => projects.id),
    title: text().notNull(),
    visibility: text().notNull().default('association'),
    invitedIds: text().array().notNull().default([]),
    authorId: text()
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp(),
    version: integer().notNull().default(1),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('thread_project_reference_unique').on(t.projectId, t.referenceNumber),
    uniqueIndex('thread_association_reference_unique')
      .on(t.referenceNumber)
      .where(sql`${t.projectId} is null`)
  ]
);
export const comments = snakeCase.table('comments', {
  id: text().primaryKey().$defaultFn(createId),
  threadId: text().references(() => threads.id),
  itemId: text().references(() => kanbanItems.id),
  authorId: text()
    .notNull()
    .references(() => users.id),
  markdown: text().notNull(),
  deletedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow()
});
export const files = snakeCase.table(
  'files',
  {
    id: text().primaryKey().$defaultFn(createId),
    hash: text().notNull(),
    objectKey: text().notNull().unique(),
    filename: text().notNull(),
    mime: text().notNull(),
    size: integer().notNull(),
    environment: text().notNull(),
    uploaderId: text()
      .notNull()
      .references(() => users.id),
    state: text().notNull().default('private'),
    orphanedAt: timestamp().defaultNow(),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [index('file_hash').on(t.environment, t.hash)]
);
export const fileReferences = snakeCase.table(
  'file_references',
  {
    id: text().primaryKey().$defaultFn(createId),
    fileId: text()
      .notNull()
      .references(() => files.id),
    ownerType: text().notNull(),
    ownerId: text().notNull(),
    public: boolean().notNull().default(false)
  },
  (t) => [uniqueIndex('file_reference_unique').on(t.fileId, t.ownerType, t.ownerId)]
);
export const auditEvents = snakeCase.table('audit_events', {
  id: text().primaryKey().$defaultFn(createId),
  actorId: text().references(() => users.id),
  projectId: text().references(() => projects.id),
  action: text().notNull(),
  targetId: text().notNull(),
  metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp().notNull().defaultNow()
});
export const outbox = snakeCase.table('outbox', {
  id: text().primaryKey().$defaultFn(createId),
  eventId: text()
    .notNull()
    .references(() => auditEvents.id),
  deliveredAt: timestamp(),
  attempts: integer().notNull().default(0),
  createdAt: timestamp().notNull().defaultNow()
});
export const authHandoffs = snakeCase.table('auth_handoffs', {
  id: text().primaryKey(),
  sessionId: text()
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  environment: text().notNull(),
  destination: text().notNull(),
  state: text().notNull(),
  challenge: text().notNull(),
  expiresAt: timestamp().notNull()
});
export const frontendSessions = snakeCase.table('frontend_sessions', {
  id: text().primaryKey(),
  sessionId: text()
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  origin: text().notNull(),
  environment: text().notNull(),
  expiresAt: timestamp().notNull()
});
export const mailJobs = snakeCase.table('mail_jobs', {
  id: text().primaryKey().$defaultFn(createId),
  to: text().notNull(),
  subject: text().notNull(),
  body: text().notNull(),
  html: text(),
  attempts: integer().notNull().default(0),
  availableAt: timestamp().notNull().defaultNow(),
  sentAt: timestamp()
});

// One current avatar proposal per member; approved profile references are separate.
export const avatarRequests = snakeCase.table('avatar_requests', {
  userId: text()
    .primaryKey()
    .references(() => users.id),
  fileId: text().references(() => files.id),
  state: text().notNull().default('pending'),
  version: integer().notNull().default(1),
  createdAt: timestamp().notNull().defaultNow(),
  reviewedAt: timestamp(),
  reviewedBy: text().references(() => users.id)
});

export const subscriptions = snakeCase.table(
  'subscriptions',
  {
    id: text().primaryKey().$defaultFn(createId),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ownerType: text().notNull(),
    ownerId: text().notNull(),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('subscription_owner_user_unique').on(t.ownerType, t.ownerId, t.userId)]
);
export const notifications = snakeCase.table(
  'notifications',
  {
    id: text().primaryKey().$defaultFn(createId),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: text()
      .notNull()
      .references(() => auditEvents.id, { onDelete: 'cascade' }),
    ownerType: text().notNull(),
    ownerId: text().notNull(),
    reason: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    readAt: timestamp(),
    emailQueuedAt: timestamp()
  },
  (t) => [
    uniqueIndex('notification_event_user_unique').on(t.eventId, t.userId),
    index('notification_user_created_idx').on(t.userId, t.createdAt)
  ]
);
export const notificationPreferences = snakeCase.table('notification_preferences', {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean().notNull().default(false),
  emailDelayMinutes: integer().notNull().default(60)
});

export const deadlineReminders = snakeCase.table(
  'deadline_reminders',
  {
    id: text().primaryKey().$defaultFn(createId),
    itemId: text()
      .notNull()
      .references(() => kanbanItems.id, { onDelete: 'cascade' }),
    dueAt: timestamp().notNull(),
    days: integer().notNull(),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [uniqueIndex('deadline_reminder_unique').on(t.itemId, t.dueAt, t.days)]
);

export const collaborationCounters = snakeCase.table('collaboration_counters', {
  scopeKey: text().primaryKey(),
  lastNumber: integer().notNull().default(0)
});

// Documentation pages belong to a project or, without one, to the association.
export const docPages = snakeCase.table(
  'doc_pages',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text().references(() => projects.id),
    slug: text().notNull(),
    title: text().notNull(),
    markdown: text().notNull().default(''),
    public: boolean().notNull().default(false),
    version: integer().notNull().default(1),
    createdBy: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('doc_page_project_slug_unique').on(t.projectId, t.slug),
    uniqueIndex('doc_page_association_slug_unique')
      .on(t.slug)
      .where(sql`${t.projectId} is null`)
  ]
);
// Every accepted change is a full snapshot credited to the member who wrote it.
export const docRevisions = snakeCase.table(
  'doc_revisions',
  {
    id: text().primaryKey().$defaultFn(createId),
    pageId: text()
      .notNull()
      .references(() => docPages.id),
    version: integer().notNull(),
    title: text().notNull(),
    markdown: text().notNull(),
    public: boolean().notNull(),
    authorId: text()
      .notNull()
      .references(() => users.id),
    reviewerId: text().references(() => users.id),
    proposalId: text(),
    reason: text().notNull().default(''),
    additions: integer().notNull().default(0),
    deletions: integer().notNull().default(0),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('doc_revision_unique').on(t.pageId, t.version),
    index('doc_revision_author_idx').on(t.authorId)
  ]
);
// Suggested edits, new pages (without pageId) and public visibility requests awaiting review.
export const docProposals = snakeCase.table(
  'doc_proposals',
  {
    id: text().primaryKey().$defaultFn(createId),
    projectId: text().references(() => projects.id),
    pageId: text().references(() => docPages.id),
    slug: text(),
    baseVersion: integer(),
    title: text().notNull(),
    markdown: text().notNull(),
    public: boolean().notNull(),
    reason: text().notNull(),
    state: text().notNull().default('pending'),
    authorId: text()
      .notNull()
      .references(() => users.id),
    reviewerId: text().references(() => users.id),
    reviewNote: text(),
    reviewedAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow()
  },
  (t) => [index('doc_proposal_state_idx').on(t.state, t.projectId)]
);
