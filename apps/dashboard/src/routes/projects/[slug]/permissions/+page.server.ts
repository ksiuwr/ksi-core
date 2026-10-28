import { error } from '@sveltejs/kit';
import { workspacePageContext } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const context = await workspacePageContext(event);
  if (!context.projectAccess.canManageGroups) error(403, 'Access denied');
  return { ...context, title: 'Permissions', tab: 'permissions' };
};
