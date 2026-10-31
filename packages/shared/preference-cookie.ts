/** Preference cookies are shared across KSI frontends; every other host keeps them local. */
export function preferenceCookieDomain(hostname: string): string | null {
  return hostname === 'ksi.edu.pl' || hostname.endsWith('.ksi.edu.pl') ? 'ksi.edu.pl' : null;
}

export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1));
  }
  return null;
}

export function preferenceCookie(
  name: string,
  value: string,
  hostname: string,
  secure: boolean
): string {
  const domain = preferenceCookieDomain(hostname);
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${secure ? '; Secure' : ''}`;
}

/**
 * Legacy builds wrote a host-only cookie, which shadows the shared domain cookie
 * even after the shared one changes. Removing it lets the domain cookie win.
 */
export function preferenceCookieRemoval(name: string, hostname: string): string | null {
  if (!preferenceCookieDomain(hostname)) return null;
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
