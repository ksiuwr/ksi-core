import { createAuthClient } from 'better-auth/svelte';
import { usernameClient } from 'better-auth/client/plugins';
import { getUrls } from 'shared';

export const authClient = createAuthClient({
  baseURL: getUrls().backend,
  basePath: '/auth',
  plugins: [usernameClient()]
  /** The base URL of the server (optional if you're using the same domain) */
});
