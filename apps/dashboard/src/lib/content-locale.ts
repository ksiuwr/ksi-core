import { contentLocale, type ContentLocale } from 'shared/content-locales';

/** Dashboard content follows the public site's `locale` cookie and defaults to Polish. */
export function dashboardContentLocale(cookie: string | null | undefined): ContentLocale {
  return contentLocale(cookie ?? 'pl');
}

/** Add the normalized content locale to a backend path without dropping existing query parameters. */
export function localizedContentPath(path: string, cookie?: string | null): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}locale=${dashboardContentLocale(cookie)}`;
}
