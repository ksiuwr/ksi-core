import { redirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { getUrls } from 'shared';
import { optionalPlatform } from '$lib/server/platform';
import { emptyProjectAccess, type PageInbox, type Project } from '$lib/types';
import type { LayoutServerLoad } from './$types';

const emptyInbox: PageInbox = { memberships: [], avatars: [] };

export const load: LayoutServerLoad = async (event) => {
  const { locals, url } = event;
  const sidebarCollapsed = event.cookies.get('ksi-sidebar') === '1';
  if (!locals.user) {
    if (url.pathname.startsWith('/sso/'))
      return {
        user: null,
        projects: [] as Project[],
        inbox: emptyInbox,
        project: null,
        projectAccess: emptyProjectAccess,
        sidebarCollapsed,
        activationContact: env.ACTIVATION_CONTACT ?? 'KSI board',
        websocketOrigin: getUrls(env).websocket,
        websiteOrigin: getUrls(env).frontend.landing
      };
    redirect(303, `/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }
  const user = locals.user;
  const projects = (await optionalPlatform<Project[]>(event, '/platform/public/projects')) ?? [];
  let inbox = emptyInbox;
  if (user.role !== 'member') {
    try {
      inbox = (await optionalPlatform<PageInbox>(event, '/users/inbox')) ?? emptyInbox;
    } catch {
      /* Permission denials must not block unrelated pages. */
    }
  }
  return {
    user,
    projects,
    inbox,
    project: null,
    projectAccess: emptyProjectAccess,
    sidebarCollapsed,
    activationContact: env.ACTIVATION_CONTACT ?? 'KSI board',
    websocketOrigin: getUrls(env).websocket,
    websiteOrigin: getUrls(env).frontend.landing
  };
};
