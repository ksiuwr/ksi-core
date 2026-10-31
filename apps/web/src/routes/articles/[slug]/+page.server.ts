import type { PageServerLoad } from './$types';
import { backendFetch } from 'shared/server';
import { contentLocale } from 'shared/content-locales';
import { renderMarkdown } from 'shared/markdown';
import { env } from '$lib/server/environment';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const response = await backendFetch(
    event,
    env,
    `/platform/public/articles/${encodeURIComponent(event.params.slug)}?locale=${contentLocale(event.cookies.get('locale'))}`
  );
  if (!response.ok) error(response.status, 'Article not found');
  const article = await response.json();
  return { article, blocks: renderMarkdown(article.markdown) };
};
