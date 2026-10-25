import { error, redirect } from '@sveltejs/kit';
import { backendFetch } from 'shared/server';
import { env } from '$lib/server/environment';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
  if (!event.locals.user)
    redirect(303, `/login?returnTo=${encodeURIComponent(event.url.pathname)}`);
  const response = await backendFetch(
    event,
    env,
    `/platform/references/${encodeURIComponent(event.params.scope)}/${encodeURIComponent(event.params.number)}`
  );
  if (!response.ok) error(response.status, 'Reference not found');
  const { href } = await response.json();
  if (
    typeof href !== 'string' ||
    !/^\/(?:projects\/[^/]+|association)\/(?:kanban|forum)(?:[/?]|$)/.test(href)
  )
    error(502, 'Invalid reference');
  redirect(303, href);
};
