import { resolveProjectContext } from '$lib/server/workspace';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const context = await resolveProjectContext(event);
  return {
    project: context.project,
    projectAccess: context.projectAccess
  };
};
