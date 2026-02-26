import { createAuthClient } from "better-auth/svelte"
import { getBackendUrl } from "shared"

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: getBackendUrl()
})
