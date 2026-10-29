import type { PageServerLoad } from './$types';
import type { DocHeading } from 'shared/docs';
import type { MarkdownBlock } from 'shared/markdown';
import { backendFetch } from 'shared/server';
import { env } from '$lib/server/environment';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async (event) => {
  const response = await backendFetch(
    event,
    env,
    `/platform/public/docs/${encodeURIComponent(event.params.workspace)}/${encodeURIComponent(event.params.slug)}`
  );
  if (!response.ok) error(response.status, 'Page not found');
  return {
    page: (await response.json()) as {
      title: string;
      slug: string;
      createdAt: string;
      updatedAt: string;
      workspace: { slug: string | null; name: string | null };
      headings: DocHeading[];
      blocks: MarkdownBlock[];
    }
  };
};
