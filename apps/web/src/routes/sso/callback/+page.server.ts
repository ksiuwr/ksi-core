import { redirect, error, isRedirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { finishSso } from 'shared/server';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    redirect(303, '/');
  }
  try {
    redirect(303, await finishSso(event, env));
  } catch (cause) {
    if (isRedirect(cause)) throw cause;
    if (event.locals.user) {
      redirect(303, '/');
    }
    error(400, 'Login expired. Please try again.');
  }
};
