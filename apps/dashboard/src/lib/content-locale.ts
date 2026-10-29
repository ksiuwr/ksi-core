import { contentLocale, defaultFrontendLocale, type ContentLocale } from 'shared/content-locales';

/** Dashboard content follows the `locale` cookie, defaulting to Wuchale's source locale (English). */
export function dashboardContentLocale(cookie: string | null | undefined): ContentLocale {
  return contentLocale(cookie ?? defaultFrontendLocale);
}

/** Add the normalized content locale to a backend path without dropping existing query parameters. */
export function localizedContentPath(path: string, cookie?: string | null): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}locale=${dashboardContentLocale(cookie)}`;
}
