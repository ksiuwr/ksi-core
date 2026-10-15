import { error, redirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { backendFetch } from 'shared/server';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
  const response = await backendFetch(
    event,
    env,
    `/files/${encodeURIComponent(event.params.id)}/download`,
    { redirect: 'manual' }
  );
  const location = response.headers.get('location');
  if (!location) error(response.status, 'File unavailable');
  redirect(302, location);
};
