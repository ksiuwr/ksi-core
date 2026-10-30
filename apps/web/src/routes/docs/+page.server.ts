import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { publicDocs } = await parent();
  return { pages: publicDocs };
};
