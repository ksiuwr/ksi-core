import type { LayoutServerLoad } from './$types';
import { makeApi } from '$lib/backend';

export const load: LayoutServerLoad = async ({ fetch, locals }) => {
  let alert = null;
  try {
    const res = await makeApi(fetch).alerts.current.get();
    alert = res.data;
  } catch {
    // no active alert
  }

  return {
    alert,
    user: locals.user,
    session: locals.session
  };
};
