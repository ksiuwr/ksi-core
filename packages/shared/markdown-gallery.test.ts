import { expect, test } from 'bun:test';
import { insertMarkdownGallery } from './markdown-gallery';

test('gallery insertion moves selected images and keeps other images and attachments', () => {
  const result = insertMarkdownGallery(
    'Text\n![a](file:image1234){width=300}\n![b](file:image5678)\n[doc](file:document123)',
    ['image1234', 'image1234', '../bad']
  );
  expect(result).not.toContain('![a]');
  expect(result).toContain('![b](file:image5678)');
  expect(result).toContain('[doc](file:document123)');
  expect(result).toContain(':::gallery preview=3\nfile:image1234\n:::');
  expect(insertMarkdownGallery('Unchanged', [])).toBe('Unchanged');
});
