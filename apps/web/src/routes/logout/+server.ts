import { env } from '$lib/server/environment';
import { backendFetch, sessionCookie } from 'shared/server';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async (event) => {
  if (event.request.headers.get('origin') !== event.url.origin)
    return new Response('Forbidden', { status: 403 });
  await backendFetch(event, env, '/sso/logout', { method: 'POST' });
  event.cookies.delete(sessionCookie(env), { path: '/' });
  return new Response(null, { status: 303, headers: { location: '/' } });
};
