import { contentLocale } from 'shared/content-locales';
import type { PageServerLoad } from './$types';
import { backendFetch } from 'shared/server';
import { env } from '$lib/server/environment';

export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const projectsReq = await backendFetch(
    event,
    env,
    `/platform/public/projects?locale=${contentLocale(event.cookies.get('locale') ?? 'pl')}`
  );
  let projects = [];
  if (projectsReq.ok) {
    const data = await projectsReq.json();
    projects = (data.projects || data || [])
      .filter((project: { fields?: string[] }) => project.fields?.includes('engineering'))
      .slice(0, 4);
  }

  return {
    projects
  };
};
