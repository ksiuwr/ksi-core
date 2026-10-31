import { preferenceCookieDomain } from './preference-cookie.ts';

export type ThemePreference = 'system' | 'light' | 'dark';
export function validTheme(value: string | null | undefined): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
export function themeFromCookie(cookies: string): ThemePreference | null {
  const value = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('ksi-theme='))
    ?.slice(10);
  return validTheme(value) ? value : null;
}
export const themeCookieDomain = preferenceCookieDomain;
