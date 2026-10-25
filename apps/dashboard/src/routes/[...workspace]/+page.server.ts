import { parseDashboardPath } from '$lib/navigation';
import { error, redirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { getUrls } from 'shared';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params, url }) => {
  const navigation = parseDashboardPath(`/${params.workspace}`);
  if (!navigation) error(404, 'Page not found');
  if (!locals.user) redirect(303, `/login?returnTo=${encodeURIComponent(url.pathname)}`);
  if (['users', '__create_project__'].includes(navigation.tab) && locals.user.role === 'member')
    error(403, 'Access denied');
  return {
    user: locals.user,
    navigation,
    activationContact: env.ACTIVATION_CONTACT ?? 'KSI board',
    websocketOrigin: getUrls(env).websocket,
    websiteOrigin: getUrls(env).frontend.landing
  };
};
