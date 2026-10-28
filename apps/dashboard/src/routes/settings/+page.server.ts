import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  title: 'Settings',
  tab: 'user-settings'
});
