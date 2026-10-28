import { taskPageLoad } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => taskPageLoad(event);
