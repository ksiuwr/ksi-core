import { createAuthClient } from 'better-auth/svelte';
import { getUrls } from 'shared';

export const authClient = createAuthClient({
  baseURL: getUrls().AUTH,
  basePath: '/auth/'
  /** The base URL of the server (optional if you're using the same domain) */
});
