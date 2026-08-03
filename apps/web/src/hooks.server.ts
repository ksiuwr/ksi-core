import type { Handle } from '@sveltejs/kit';
import { locales } from './locales/data.js';
import { getUrls } from 'shared';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const res = await event.fetch(`${getUrls().BACKEND}/auth/get-session`, {
      headers: { cookie: event.request.headers.get('cookie') ?? '' }
    });
    if (res.ok) {
      const data = await res.json();
      event.locals.session = data?.session ?? null;
      event.locals.user = data?.user ?? null;
    } else {
      event.locals.session = null;
      event.locals.user = null;
    }
  } catch {
    event.locals.session = null;
    event.locals.user = null;
  }

  const cookieLocale = event.cookies.get('locale');
  const locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? cookieLocale : 'en';

  return await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
  });
};
