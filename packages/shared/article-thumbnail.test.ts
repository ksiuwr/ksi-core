import { expect, test } from 'bun:test';
import { articleThumbnail } from './article-thumbnail';

test('covers use content images and never unsafe schemes or code examples', () => {
  expect(articleThumbnail('No pictures')).toBeNull();
  expect(
    articleThumbnail('`![example](file:example123)`\n![cover](file:cover1234){width=200}')
  ).toBe('/media/cover1234');
  expect(
    articleThumbnail('![bad](javascript:alert(1))\n![ok](https://example.com/cover.webp)')
  ).toBe('https://example.com/cover.webp');
  expect(articleThumbnail(':::gallery preview=3\nfile:gallery123\n:::')).toBe('/media/gallery123');
  expect(articleThumbnail('```md\n:::gallery\nfile:example123\n:::\n```')).toBeNull();
});
