import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { project } = await parent();
  return { project, title: 'Overview', tab: 'overview' };
};
