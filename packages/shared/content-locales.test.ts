import { expect, test } from 'bun:test';
import {
  localizeContent,
  contentLocale,
  articleFileContent,
  hasEnglishSources,
  frontendLocales,
  contentLocales
} from './content-locales';
test('public translations fall back per field and only support frontend locales', () => {
  expect(frontendLocales.map(contentLocale)).toEqual([...contentLocales]);
  const project = {
    name: 'Robot',
    description: 'English description',
    tags: ['robotics'],
    translations: { pl: { name: 'Robot PL', description: '  ', tags: ['robotyka'] } }
  };
  expect(localizeContent(project, 'pl')).toMatchObject({
    name: 'Robot PL',
    description: 'English description',
    tags: ['robotyka']
  });
  expect(localizeContent(project, 'fr')).toBe(project);
  expect(hasEnglishSources({ name: '' }, { name: 'Nazwa' })).toBe(false);
  expect(hasEnglishSources({ bio: null }, { bio: '' })).toBe(true);
});
test('file references include the thumbnail and all translated article content', () => {
  expect(
    articleFileContent({
      markdown: 'file:english12',
      thumbnailFileId: 'thumbnail123',
      translations: { pl: { markdown: 'file:polish123' } }
    })
  ).toBe('file:english12\nfile:thumbnail123\nfile:polish123');
});
