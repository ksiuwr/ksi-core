import { env as privateEnvironment } from '$env/dynamic/private';
import { env as publicEnvironment } from '$env/dynamic/public';

// SvelteKit separates PUBLIC_* origins from private server credentials.
export const env: Record<string, string | undefined> = {
  ...privateEnvironment,
  ...publicEnvironment
};
