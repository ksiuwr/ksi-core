import type { Handle } from '@sveltejs/kit';
import { locales } from './locales/data.js';

export const handle: Handle = async ({ event, resolve }) => {
  const cookieLocale = event.cookies.get('locale');
  const locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? cookieLocale : 'en';
  return await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
  });
};
