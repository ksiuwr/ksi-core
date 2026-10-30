import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { backendFetch } from 'shared/server';
import { contentLocale } from 'shared/content-locales';
import type { PublicDocSummary } from 'shared/public-docs';
import { env } from '$lib/server/environment';

export const load: LayoutServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const locale = contentLocale(event.cookies.get('locale') ?? 'pl');
  const response = await backendFetch(event, env, `/platform/public/docs?locale=${locale}`);
  if (!response.ok) error(response.status, 'Documentation unavailable');
  return { publicDocs: (await response.json()) as PublicDocSummary[] };
};
