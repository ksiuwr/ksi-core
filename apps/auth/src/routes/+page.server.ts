import { redirect } from '@sveltejs/kit';

export const load = () => {
  return redirect(301, '/sign-in');
};
