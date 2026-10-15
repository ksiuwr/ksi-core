import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { locales } from './locales/data.js';
import { backendFetch, startSso, sessionCookie } from 'shared/server';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.session = null;
  if (env.PROXY_SECRET && event.cookies.get(sessionCookie(env))) {
    try {
      const res = await backendFetch(event, env, '/sso/session');
      if (res.ok) {
        const { user } = await res.json();
        event.locals.user = user;
        event.locals.session = user ? { id: user.id } : null;
      }
    } catch {
      /* public pages remain available */
    }
  }
  if (
    env.PROXY_SECRET &&
    !event.locals.user &&
    !event.cookies.get('ksi-sso-probed') &&
    event.request.method === 'GET' &&
    event.request.headers.get('accept')?.includes('text/html') &&
    !/^\/(api|sso|login|logout)(\/|$)/.test(event.url.pathname)
  )
    redirect(303, startSso(event, env, event.url.pathname + event.url.search, true));
  const cookieLocale = event.cookies.get('locale');
  const locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? cookieLocale : 'pl';
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
  });
};
