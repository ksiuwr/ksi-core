import { renderMarkdown } from 'shared/markdown';
import { contentLocale } from 'shared/content-locales';
import type { PageServerLoad, Actions } from './$types';
import { backendFetch } from 'shared/server';
import { getUrls } from 'shared';
import { env as privateEnvironment } from '$env/dynamic/private';
import { env as publicEnvironment } from '$env/dynamic/public';
import { error, fail } from '@sveltejs/kit';
const environment = { ...privateEnvironment, ...publicEnvironment };
export const load: PageServerLoad = async (event) => {
  event.depends('ksi:localized-content');
  const response = await backendFetch(
    event,
    environment,
    `/platform/public/projects/${encodeURIComponent(event.params.slug)}?locale=${contentLocale(event.cookies.get('locale') ?? 'pl')}`
  );
  if (!response.ok) {
    error(
      response.status,
      response.status === 404
        ? 'Project not found'
        : 'Unable to load the project. Please try again.'
    );
  }
  const project = await response.json();
  let access = { isMember: false, canEdit: false, canManageMembers: false };
  if (event.locals.user?.membershipStatus === 'active') {
    const scoped = await backendFetch(
      event,
      environment,
      `/platform/projects/${encodeURIComponent(project.id)}`
    );
    if (scoped.ok) access = await scoped.json();
  }
  return {
    project,
    descriptionBlocks: renderMarkdown(project.description ?? ''),
    mainArticleBlocks: project.mainArticle ? renderMarkdown(project.mainArticle.markdown) : [],
    access,
    dashboardOrigin: getUrls(environment).frontend.dashboard
  };
};
export const actions: Actions = {
  join: async (event) => {
    const projectResponse = await backendFetch(
      event,
      environment,
      `/platform/public/projects/${encodeURIComponent(event.params.slug)}?locale=${contentLocale(event.cookies.get('locale') ?? 'pl')}`
    );
    if (!projectResponse.ok) {
      return fail(projectResponse.status, {
        message:
          projectResponse.status === 404
            ? 'Project not found'
            : 'Unable to load the project. Please try again.'
      });
    }
    const project = await projectResponse.json();
    const response = await backendFetch(
      event,
      environment,
      `/platform/projects/${encodeURIComponent(project.id)}/join`,
      { method: 'POST' }
    );
    if (!response.ok) return fail(response.status, { message: 'Unable to join the project.' });
    const outcome = await response.json();
    return { joined: true, requested: outcome.state === 'request' };
  }
};
