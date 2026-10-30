import type { PageServerLoad } from './$types';
import type { DocHeading } from 'shared/docs';
import type { MarkdownBlock } from 'shared/markdown';
import { backendFetch } from 'shared/server';
import { contentLocale, type ContentLocale } from 'shared/content-locales';
import { env } from '$lib/server/environment';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const docLocale = contentLocale(event.cookies.get('locale') ?? 'pl');
  const response = await backendFetch(
    event,
    env,
    `/platform/public/docs/${encodeURIComponent(event.params.workspace)}/${encodeURIComponent(event.params.slug)}?locale=${docLocale}`
  );
  if (!response.ok) error(response.status, 'Page not found');
  return {
    docLocale,
    page: (await response.json()) as {
      title: string;
      slug: string;
      public: boolean;
      folder: string;
      locale: ContentLocale;
      locales: ContentLocale[];
      outdatedLocales: ContentLocale[];
      createdAt: string;
      updatedAt: string;
      workspace: { slug: string | null; name: string | null };
      headings: DocHeading[];
      blocks: MarkdownBlock[];
      /** The reader's dashboard rights; null for guests and inactive accounts. */
      access: { canReview: boolean; canPublish: boolean; canPropose: boolean } | null;
    }
  };
};
