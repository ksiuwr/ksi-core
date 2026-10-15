import { redirect, isRedirect } from '@sveltejs/kit';
import { env } from '$lib/server/environment';
import { startSso } from 'shared/server';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
  redirect(303, startSso(event, env, event.url.searchParams.get('returnTo') ?? '/'));
};
