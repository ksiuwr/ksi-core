import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ title: 'Projects', tab: 'projects' });
