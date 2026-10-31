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
