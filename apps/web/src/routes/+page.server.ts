import { contentLocale } from 'shared/content-locales';
import type { PageServerLoad } from './$types';
import { backendFetch } from 'shared/server';
import { env } from '$lib/server/environment';

export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  let projects: Array<{ fields?: string[] }> = [];
  try {
    const projectsReq = await backendFetch(
      event,
      env,
      `/platform/public/projects?locale=${contentLocale(event.cookies.get('locale'))}`
    );
    if (projectsReq.ok) {
      const data = await projectsReq.json();
      const list = Array.isArray(data) ? data : (data?.projects ?? []);
      if (Array.isArray(list))
        projects = list
          .filter((project: { fields?: string[] }) => project.fields?.includes('engineering'))
          .slice(0, 4);
    }
  } catch {
    // The marketing site must stay available while the API is restarting.
  }

  return {
    projects
  };
};
