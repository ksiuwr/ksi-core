import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ title: 'Member profile', tab: 'person' });
