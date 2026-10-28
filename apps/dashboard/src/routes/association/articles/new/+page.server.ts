import { newArticlePageLoad } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => newArticlePageLoad(event);
