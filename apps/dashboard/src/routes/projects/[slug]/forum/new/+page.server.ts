import { newThreadPageLoad } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => newThreadPageLoad(event);
