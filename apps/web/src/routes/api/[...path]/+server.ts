import type { RequestHandler } from './$types';
import { env } from '$lib/server/environment';
import { proxy } from 'shared/server';
const handler: RequestHandler = (event) => proxy(event, env, 'web');
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS
};
