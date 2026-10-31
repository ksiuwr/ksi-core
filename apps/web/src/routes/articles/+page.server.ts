import type { PageServerLoad } from './$types';
import { backendFetch } from 'shared/server';
import { contentLocale } from 'shared/content-locales';
import { env } from '$lib/server/environment';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const response = await backendFetch(
    event,
    env,
    `/platform/public/articles?locale=${contentLocale(event.cookies.get('locale'))}`
  );
  if (!response.ok) error(response.status, 'Articles unavailable');
  return { articles: await response.json() };
};
