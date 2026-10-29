import { error, redirect } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';
import type { PageInbox } from '../types';
import {
  getArticle,
  getArticles,
  getBoard,
  getBoardInvolvement,
  getBoardItems,
  getEvents,
  getItemActivity,
  getItemComments,
  getMembers,
  getThread,
  getThreadActivity,
  getThreads,
  optionalPlatform,
  platform
} from './platform';
import {
  associationContext,
  canCreateArticle,
  canEditArticle,
  canManageWorkspace,
  canPublishArticle,
  canSaveArticle,
  type WorkspaceContext
} from './workspace';
import { taskPath, threadPath } from '../navigation';
import type { Profile } from 'shared/types';

export async function workspacePageContext(event: ServerLoadEvent): Promise<WorkspaceContext> {
  const parent = await event.parent();
  if (parent?.project)
    return {
      workspace: 'project',
      project: parent.project,
      projectAccess: parent.projectAccess
    };
  return associationContext();
}

/** Everything the overview needs; each source degrades to empty instead of failing the page. */
export async function overviewPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const projectId = context.project?.id ?? null;
  const [board, threads, members, articles] = await Promise.all([
    getBoard(event, projectId),
    getThreads(event, projectId).catch(() => []),
    getMembers(event, projectId),
    getArticles(event, projectId).catch(() => [])
  ]);
  const items = board ? await getBoardItems(event, board.id).catch(() => []) : [];
  return {
    ...context,
    board,
    items,
    threads: threads.slice(0, 5),
    threadCount: threads.length,
    members,
    articleCount: articles.length,
    title: 'Overview',
    tab: 'overview'
  };
}

export async function kanbanPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const itemId = event.url.searchParams.get('item');
  if (itemId) {
    const projectId = context.project?.id ?? null;
    const board = await getBoard(event, projectId);
    const items = board ? await getBoardItems(event, board.id) : [];
    const item = items.find(
      (candidate) =>
        candidate.id === itemId ||
        (candidate.referenceNumber != null && String(candidate.referenceNumber) === itemId)
    );
    redirect(
      303,
      taskPath(context.workspace, context.project?.slug ?? '', item?.referenceNumber ?? itemId)
    );
  }
  const projectId = context.project?.id ?? null;
  const board = await getBoard(event, projectId);
  const [items, involvement] = board
    ? await Promise.all([getBoardItems(event, board.id), getBoardInvolvement(event, board.id)])
    : [[], null];
  return {
    ...context,
    board,
    items,
    involvement,
    title: 'Kanban',
    tab: 'board',
    canManage: canManageWorkspace(context, event.locals.user as Profile)
  };
}

export async function newTaskPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const projectId = context.project?.id ?? null;
  const board = await getBoard(event, projectId);
  const items = board ? await getBoardItems(event, board.id) : [];
  return { ...context, board, items, title: 'New task', tab: 'board' };
}

export async function graveyardPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  if (!canManageWorkspace(context, event.locals.user as Profile)) error(403, 'Access denied');
  const projectId = context.project?.id ?? null;
  const board = await getBoard(event, projectId);
  const items = board ? await getBoardItems(event, board.id, true) : [];
  return {
    ...context,
    statuses: board?.statuses ?? [],
    items,
    title: 'Removed tasks',
    tab: 'board'
  };
}

export async function forumPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const archived = event.url.searchParams.get('archived') === 'true';
  const threads = await getThreads(event, context.project?.id ?? null, archived);
  return { ...context, threads, archived, title: 'Forum', tab: 'forum' };
}

export async function newThreadPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  return { ...context, title: 'New thread', tab: 'forum' };
}

export async function threadPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const threadId = event.params.thread;
  if (!threadId) error(404, 'Thread not found');
  const thread = await getThread(event, threadId, context.project?.id ?? null);
  if ((thread.projectId ?? null) !== (context.project?.id ?? null)) error(404, 'Thread not found');
  if (thread.id === threadId && thread.referenceNumber != null)
    redirect(
      303,
      threadPath(context.workspace, context.project?.slug ?? '', thread.referenceNumber)
    );
  const [history, members] = await Promise.all([
    getThreadActivity(event, thread.id),
    getMembers(event, context.project?.id ?? null)
  ]);
  return {
    ...context,
    thread,
    members,
    events: history ?? [],
    eventsNextPage: history ? (history.length === 20 ? 1 : null) : 0,
    eventsError: history === null,
    title: thread.title,
    tab: 'forum',
    canManage: canManageWorkspace(context, event.locals.user as Profile),
    userId: (event.locals.user as Profile).id
  };
}

export async function articlesPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const articles = await getArticles(event, context.project?.id ?? null);
  return {
    ...context,
    articles,
    title: 'Articles',
    tab: 'articles',
    canCreate: canCreateArticle(context)
  };
}

export async function newArticlePageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  if (!canCreateArticle(context)) error(403, 'Access denied');
  return { ...context, title: 'New article', tab: 'articles' };
}

export async function articlePageLoad(event: ServerLoadEvent) {
  const slug = event.params.slug;
  if (!slug) error(404, 'Article not found');
  const article = await getArticle(event, slug);
  const parent = await event.parent();
  const project = article.projectId
    ? ((parent.projects as { id: string; slug: string }[] | undefined)?.find(
        (item) => item.id === article.projectId
      ) ?? null)
    : null;
  if (article.projectId && !project) error(404, 'Article not found');
  const projectAccess = project
    ? await platform<WorkspaceContext['projectAccess']>(
        event,
        `/platform/projects/${encodeURIComponent(project.id)}`
      )
    : {
        isMember: false,
        canEdit: false,
        canManageMembers: false,
        canManageGroups: false,
        canReadPreviewCredentials: false,
        canProposeArticles: false,
        canPublishArticles: false,
        canEditAnyArticles: false
      };
  const context: WorkspaceContext = {
    workspace: project ? 'project' : 'association',
    project: project as WorkspaceContext['project'],
    projectAccess
  };
  return {
    ...context,
    articleProject: context.project,
    article,
    title: article.title,
    tab: 'articles',
    permissions: {
      canCreate: canCreateArticle(context),
      canEdit: canEditArticle(context, event.locals.user as Profile),
      canSave: canSaveArticle(context, event.locals.user as Profile),
      canPublish: canPublishArticle(context, event.locals.user as Profile),
      canPropose: context.workspace !== 'project' || projectAccess.canProposeArticles,
      canManage: canManageWorkspace(context, event.locals.user as Profile)
    }
  };
}

export async function eventsPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const events = await getEvents(event, context.project?.id ?? null);
  return { ...context, events, title: 'Activity', tab: 'events' };
}

export async function rosterPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  return { ...context, title: 'Members', tab: 'roster' };
}

export async function taskPageLoad(event: ServerLoadEvent) {
  const context = await workspacePageContext(event);
  const projectId = context.project?.id ?? null;
  const board = await getBoard(event, projectId);
  if (!board) error(404, 'Task not found');
  const items = await getBoardItems(event, board.id);
  const item = items.find(
    (candidate) =>
      candidate.id === event.params.id ||
      (candidate.referenceNumber != null && String(candidate.referenceNumber) === event.params.id)
  );
  if (!item) error(404, 'Task not found');
  if (item.id === event.params.id && item.referenceNumber != null)
    redirect(303, taskPath(context.workspace, context.project?.slug ?? '', item.referenceNumber));
  const [members, comments, activity] = await Promise.all([
    getMembers(event, projectId),
    getItemComments(event, item.id),
    getItemActivity(event, item.id)
  ]);
  return {
    ...context,
    board,
    item,
    items,
    members,
    comments,
    activity: activity ?? [],
    activityNextPage: activity ? (activity.length === 20 ? 1 : null) : 0,
    activityError: activity === null,
    title: item.title,
    tab: 'board',
    canManage: canManageWorkspace(context, event.locals.user as Profile),
    userId: (event.locals.user as Profile).id
  };
}

export async function profilePageLoad(event: ServerLoadEvent) {
  const user = event.locals.user as Profile;
  const [avatarRequest, current] = await Promise.all([
    optionalPlatform<{ state: string; fileId: string | null; version: number }>(
      event,
      '/users/me/avatar-request'
    ),
    platform<{ user: Profile }>(event, '/users/me')
  ]);
  const sessions = await optionalPlatform<
    {
      id: string;
      createdAt: string;
      expiresAt: string;
      ipAddress: string | null;
      userAgent: string | null;
      isCurrent: boolean;
    }[]
  >(event, '/users/me/sessions');
  return {
    profile: current.user ?? user,
    avatarRequest,
    activeSessions: sessions ?? [],
    title: 'My profile',
    tab: 'profile'
  };
}

export async function inboxPageLoad(event: ServerLoadEvent) {
  const parent = await event.parent();
  return {
    inbox: (parent?.inbox as PageInbox | undefined) ?? { memberships: [], avatars: [] },
    title: 'Notifications',
    tab: 'inbox'
  };
}
