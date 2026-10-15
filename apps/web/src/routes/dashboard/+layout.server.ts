import { redirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { getUrls } from 'shared';
export const load = () => redirect(303, `${getUrls(env).frontend.dashboard}/`);
