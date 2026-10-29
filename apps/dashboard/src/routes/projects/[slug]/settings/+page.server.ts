import { error } from '@sveltejs/kit';
import { workspacePageContext } from '$lib/server/pages';
import { getProject } from '$lib/server/platform';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const context = await workspacePageContext(event);
  if (!context.projectAccess.canEdit && !context.projectAccess.canManageMembers)
    error(403, 'Access denied');
  // The parent catalog is localized for display; settings must edit the source values.
  const project = context.project ? await getProject(event, context.project.id) : null;
  return { ...context, project, title: 'Settings', tab: 'settings' };
};
