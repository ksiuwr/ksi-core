import { isIP } from 'node:net';

// KSI frontends proxy backend requests, so the backend only sees the frontend
// runtime's own User-Agent (e.g. `Bun/1.3.x`) and address. These headers carry
// the browser's details instead. The backend trusts them only on requests that
// proved they came from a frontend with PROXY_SECRET.
export const clientUserAgentHeader = 'x-ksi-client-user-agent';
export const clientIpHeader = 'x-ksi-client-ip';
export const maxClientUserAgentLength = 512;
const maxIpLength = 45;

export interface ClientContext {
  userAgent: string | null;
  ip: string | null;
}

/** Keeps a usable, bounded User-Agent or returns null. */
export function clientUserAgent(value: string | null | undefined): string | null {
  const userAgent = value?.trim();
  return userAgent ? userAgent.slice(0, maxClientUserAgentLength) : null;
}

/** Keeps a single valid IPv4/IPv6 address or returns null. */
export function clientIp(value: string | null | undefined): string | null {
  const ip = value?.trim();
  return ip && ip.length <= maxIpLength && isIP(ip) ? ip : null;
}

/** Sets the browser's details on a backend request, replacing anything already there. */
export function forwardClientContext(headers: Headers, client: ClientContext): void {
  const userAgent = clientUserAgent(client.userAgent),
    ip = clientIp(client.ip);
  if (userAgent) headers.set(clientUserAgentHeader, userAgent);
  else headers.delete(clientUserAgentHeader);
  if (ip) headers.set(clientIpHeader, ip);
  else headers.delete(clientIpHeader);
}

/**
 * Rewrites a proxied request's headers so Better Auth records the forwarded
 * browser instead of the frontend server runtime. `user-agent` and
 * `x-forwarded-for` are derived only from the forwarded details, so a missing
 * value stays unknown rather than exposing the proxy. Call this only after the
 * request's PROXY_SECRET and origin have been verified.
 */
export function trustedClientHeaders(headers: Headers): Headers {
  const result = new Headers(headers),
    userAgent = clientUserAgent(headers.get(clientUserAgentHeader)),
    ip = clientIp(headers.get(clientIpHeader));
  result.delete(clientUserAgentHeader);
  result.delete(clientIpHeader);
  result.delete('user-agent');
  if (userAgent) result.set('user-agent', userAgent);
  result.delete('x-forwarded-for');
  if (ip) result.set('x-forwarded-for', ip);
  return result;
}
