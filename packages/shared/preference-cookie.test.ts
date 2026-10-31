import { expect, test } from 'bun:test';
import { preferenceCookie, preferenceCookieDomain, readCookie } from './preference-cookie';
import { frontendLocale, frontendLocaleFromCookie } from './content-locales';

test('preference cookies are shared only on the KSI domain', () => {
  expect(preferenceCookieDomain('auth.ksi.edu.pl')).toBe('ksi.edu.pl');
  expect(preferenceCookieDomain('ksi.edu.pl')).toBe('ksi.edu.pl');
  expect(preferenceCookieDomain('preview-dash.ksi.edu.pl')).toBe('ksi.edu.pl');
  for (const host of [
    'localhost',
    '127.0.0.1',
    'ksi.edu.pl.evil.test',
    'notksi.edu.pl',
    'preview.pages.dev'
  ])
    expect(preferenceCookieDomain(host)).toBeNull();
  expect(preferenceCookie('locale', 'en-us', 'dash.ksi.edu.pl', true)).toBe(
    'locale=en-us; Path=/; Max-Age=31536000; SameSite=Lax; Domain=ksi.edu.pl; Secure'
  );
  expect(preferenceCookie('locale', 'pl', 'localhost', false)).not.toContain('Domain=');
});
test('UI locale cookies accept supported locales and the legacy en alias', () => {
  expect(frontendLocaleFromCookie('session=private; locale=en-us')).toBe('en-us');
  expect(frontendLocaleFromCookie('locale=pl')).toBe('pl');
  expect(frontendLocaleFromCookie('locale=en')).toBe('en-us');
  expect(frontendLocaleFromCookie('locale=de')).toBeNull();
  expect(frontendLocaleFromCookie('ksi-locale=pl')).toBeNull();
  expect(readCookie('locale=pl; locale=en-us', 'locale')).toBe('pl');
  expect(frontendLocale('en')).toBe('en-us');
  expect(frontendLocale('de-DE')).toBeNull();
});
