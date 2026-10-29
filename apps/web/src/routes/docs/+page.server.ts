import type { PageServerLoad } from './$types';
import { backendFetch } from 'shared/server';
import { env } from '$lib/server/environment';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async (event) => {
  const response = await backendFetch(event, env, '/platform/public/docs');
  if (!response.ok) error(response.status, 'Documentation unavailable');
  return {
    pages: (await response.json()) as {
      slug: string;
      title: string;
      excerpt: string;
      updatedAt: string;
      projectSlug: string | null;
      projectName: string | null;
    }[]
  };
};
