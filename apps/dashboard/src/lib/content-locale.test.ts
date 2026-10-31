/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { contentLocale, defaultFrontendLocale } from 'shared/content-locales';
import { dashboardContentLocale, localizedContentPath } from './content-locale';

describe('dashboard content locale', () => {
  test('normalizes the locale cookie and defaults to the primary content locale', () => {
    expect(dashboardContentLocale(null)).toBe(contentLocale(defaultFrontendLocale));
    expect(dashboardContentLocale(undefined)).toBe('pl');
    expect(dashboardContentLocale('pl')).toBe('pl');
    expect(dashboardContentLocale('en-us')).toBe('en');
    expect(dashboardContentLocale('en')).toBe('en');
    expect(dashboardContentLocale('de-DE')).toBe('pl');
  });

  test('adds the normalized locale without dropping query parameters', () => {
    expect(localizedContentPath('/platform/public/projects')).toBe(
      '/platform/public/projects?locale=pl'
    );
    expect(localizedContentPath('/platform/public/projects', 'en-us')).toBe(
      '/platform/public/projects?locale=en'
    );
    expect(localizedContentPath('/platform/threads?archived=false', 'pl')).toBe(
      '/platform/threads?archived=false&locale=pl'
    );
  });
});
