import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  if (!user || user.role === 'member') error(403, 'Access denied');
  return { title: 'New project', tab: '__create_project__' };
};
