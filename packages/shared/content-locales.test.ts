import { expect, test } from 'bun:test';
import {
  localizeContent,
  contentLocale,
  articleFileContent,
  hasPrimarySources,
  frontendLocales,
  defaultFrontendLocale,
  contentLocales,
  primaryContentLocale,
  translationLocales
} from './content-locales';
test('Polish is the default UI language and the required content language', () => {
  expect(contentLocale(defaultFrontendLocale)).toBe(primaryContentLocale);
  expect(new Set(frontendLocales.map(contentLocale))).toEqual(new Set(contentLocales));
  expect(translationLocales).toEqual(['en']);
  for (const missing of [null, undefined, '', 'de-DE', 'not a locale'])
    expect(contentLocale(missing)).toBe('pl');
});
test('English translations fall back per field to the Polish content', () => {
  const project = {
    name: 'Robot',
    description: 'Polski opis',
    tags: ['robotyka'],
    translations: { en: { name: 'Robot EN', description: '  ', tags: ['robotics'] } }
  };
  expect(localizeContent(project, 'en-us')).toMatchObject({
    name: 'Robot EN',
    description: 'Polski opis',
    tags: ['robotics']
  });
  expect(localizeContent(project, 'pl')).toBe(project);
  expect(localizeContent(project, 'fr')).toBe(project);
  expect(hasPrimarySources({ name: '' }, { name: 'Name' })).toBe(false);
  expect(hasPrimarySources({ bio: null }, { bio: '' })).toBe(true);
});
test('file references include the thumbnail and all translated article content', () => {
  expect(
    articleFileContent({
      markdown: 'file:polish123',
      thumbnailFileId: 'thumbnail123',
      translations: { en: { markdown: 'file:english12' } }
    })
  ).toBe('file:polish123\nfile:thumbnail123\nfile:english12');
});
