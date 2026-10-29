import { error, type RequestEvent } from '@sveltejs/kit';
import { backendFetch } from 'shared/server';
import { env } from './environment';
import type {
  ActivityEvent,
  Article,
  AssignmentMember,
  BoardData,
  Comment,
  Item,
  Project,
  ProjectAccess,
  Thread,
  ThreadEvent
} from '../types';
import type { TaskInvolvement } from '../task-filters';

type JsonInit = Omit<RequestInit, 'body'> & { body?: unknown };

async function send(
  event: RequestEvent,
  path: string,
  init: JsonInit = {}
): Promise<{ ok: boolean; status: number; body: any }> {
  const { body: rawBody, ...rest } = init;
  const headers = new Headers(rest.headers);
  const request: RequestInit = { ...rest, headers };
  if (rawBody !== undefined) {
    headers.set('content-type', 'application/json');
    request.body = JSON.stringify(rawBody);
  }
  const response = await backendFetch(event, env, path, request);
  const text = await response.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

export async function platform<T>(
  event: RequestEvent,
  path: string,
  init: JsonInit = {}
): Promise<T> {
  const response = await send(event, path, init);
  if (!response.ok) {
    const message =
      response.body && typeof response.body === 'object'
        ? (response.body.code ?? response.body.message)
        : null;
    error(response.status, message ?? 'The backend request failed.');
  }
  return response.body as T;
}

export async function optionalPlatform<T>(
  event: RequestEvent,
  path: string,
  init: JsonInit = {}
): Promise<T | null> {
  const response = await send(event, path, init);
  return response.ok ? (response.body as T) : null;
}

export async function getProjects(event: RequestEvent): Promise<Project[]> {
  return platform<Project[]>(event, '/platform/public/projects');
}

export async function getProjectAccess(event: RequestEvent, id: string): Promise<ProjectAccess> {
  return platform<ProjectAccess>(event, `/platform/projects/${encodeURIComponent(id)}`);
}

export async function getBoard(
  event: RequestEvent,
  projectId: string | null
): Promise<BoardData | null> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return optionalPlatform<BoardData>(event, `/platform/boards${query}`);
}

export async function getBoardItems(
  event: RequestEvent,
  boardId: string,
  graveyard = false
): Promise<Item[]> {
  return platform<Item[]>(
    event,
    `/platform/boards/${encodeURIComponent(boardId)}/items?graveyard=${graveyard}`
  );
}

/** Optional: the board still filters by assignee and author when this is unavailable. */
export async function getBoardInvolvement(
  event: RequestEvent,
  boardId: string
): Promise<TaskInvolvement | null> {
  return optionalPlatform<TaskInvolvement>(
    event,
    `/platform/boards/${encodeURIComponent(boardId)}/involvement`
  );
}

export async function getMembers(
  event: RequestEvent,
  projectId: string | null
): Promise<AssignmentMember[]> {
  return optionalPlatform<AssignmentMember[]>(
    event,
    projectId ? `/platform/projects/${encodeURIComponent(projectId)}/members` : '/platform/members'
  ).then((members) => members ?? []);
}

export async function getThreads(
  event: RequestEvent,
  projectId: string | null,
  archived = false
): Promise<Thread[]> {
  const query = new URLSearchParams({ archived: String(archived) });
  if (projectId) query.set('projectId', projectId);
  return platform<Thread[]>(event, `/platform/threads?${query}`);
}

export async function getThread(event: RequestEvent, id: string): Promise<Thread> {
  return platform<Thread>(event, `/platform/threads/${encodeURIComponent(id)}`);
}

export async function getThreadActivity(
  event: RequestEvent,
  id: string
): Promise<ThreadEvent[] | null> {
  return optionalPlatform<ThreadEvent[]>(
    event,
    `/platform/threads/${encodeURIComponent(id)}/activity`
  );
}

export async function getArticles(
  event: RequestEvent,
  projectId: string | null
): Promise<Article[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return platform<Article[]>(event, `/platform/articles${query}`);
}

export async function getArticle(event: RequestEvent, slug: string): Promise<Article> {
  return platform<Article>(event, `/platform/articles/by-slug/${encodeURIComponent(slug)}`);
}

export async function getEvents(
  event: RequestEvent,
  projectId: string | null
): Promise<ActivityEvent[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return platform<ActivityEvent[]>(event, `/platform/events${query}`);
}

export async function getItemComments(event: RequestEvent, id: string): Promise<Comment[]> {
  return optionalPlatform<Comment[]>(
    event,
    `/platform/items/${encodeURIComponent(id)}/comments`
  ).then((comments) => comments ?? []);
}

export async function getItemActivity(
  event: RequestEvent,
  id: string
): Promise<ThreadEvent[] | null> {
  return optionalPlatform<ThreadEvent[]>(
    event,
    `/platform/items/${encodeURIComponent(id)}/activity`
  );
}

export type { BoardData, Item, Comment, Thread, ThreadEvent, Article, Project, ProjectAccess };
