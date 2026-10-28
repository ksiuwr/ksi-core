import { newTaskPageLoad } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => newTaskPageLoad(event);
