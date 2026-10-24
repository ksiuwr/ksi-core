import { expect, test } from 'bun:test';
import {
  insertMarkdownGallery,
  markdownGalleries,
  updateMarkdownGallery,
  toggleGalleryImage,
  removeGalleryImage,
  moveGalleryImage
} from './markdown-gallery';

test('gallery insertion moves selected images and keeps other images and attachments', () => {
  const result = insertMarkdownGallery(
    'Text\n![a](file:image1234){width=300}\n![b](file:image5678)\n[doc](file:document123)',
    ['image1234', 'image1234', '../bad']
  );
  expect(result).not.toContain('![a]');
  expect(result).toContain('![b](file:image5678)');
  expect(result).toContain('[doc](file:document123)');
  expect(result).toContain(':::gallery preview=1\nfile:image1234\n:::');
  expect(insertMarkdownGallery('Unchanged', [])).toBe('Unchanged');
});

const ids = ['image1111', 'image2222', 'image3333', 'image4444', 'image5555'];

test('toggling moves images to either side of the preview boundary', () => {
  const initial = { ids, preview: 3 };
  const off = toggleGalleryImage(initial, ids[1]!);
  expect(off).toEqual({ ids: [ids[0], ids[2], ids[1], ids[3], ids[4]], preview: 2 });
  const on = toggleGalleryImage(off, ids[4]!);
  expect(on).toEqual({ ids: [ids[0], ids[2], ids[4], ids[1], ids[3]], preview: 3 });
  expect(initial).toEqual({ ids, preview: 3 });
});

test('reordering preserves preview membership and removal updates its count', () => {
  const state = { ids, preview: 3 };
  expect(moveGalleryImage(state, ids[0]!, 2)).toEqual({
    ids: [ids[1], ids[2], ids[0], ids[3], ids[4]],
    preview: 3
  });
  expect(moveGalleryImage(state, ids[4]!, 0)).toEqual({
    ids: [ids[0], ids[1], ids[2], ids[4], ids[3]],
    preview: 3
  });
  expect(removeGalleryImage(state, ids[0]!)).toEqual({ ids: ids.slice(1), preview: 2 });
  expect(removeGalleryImage(state, ids[4]!)).toEqual({ ids: ids.slice(0, 4), preview: 3 });
  expect(moveGalleryImage(state, 'missing', 0)).toBe(state);
});

test('saved galleries round-trip order, preview selection and surrounding content', () => {
  const first = insertMarkdownGallery('Before', ids, 3);
  const source = insertMarkdownGallery(first + '\nBetween', ['second123'], 1) + '\nAfter';
  const changed = updateMarkdownGallery(
    source,
    0,
    toggleGalleryImage({ ids, preview: 3 }, ids[0]!)
  );
  const parsed = markdownGalleries(changed);
  expect(parsed[0]).toMatchObject({ ids: [ids[1], ids[2], ids[0], ids[3], ids[4]], preview: 2 });
  expect(parsed[1]).toMatchObject({ ids: ['second123'], preview: 1 });
  expect(changed).toContain('Before');
  expect(changed).toContain('Between');
  expect(changed).toContain('After');
  const removed = updateMarkdownGallery(changed, 0, { ids: [], preview: 0 });
  expect(markdownGalleries(removed)).toHaveLength(1);
  expect(removed).toContain('Before');
  expect(removed).toContain('Between');
  expect(removed).toContain('After');
});

test('all images can be unselected without removing them from the gallery', () => {
  const emptyPreview = ids.reduce((state, id) => toggleGalleryImage(state, id), {
    ids,
    preview: ids.length
  });
  expect(emptyPreview.preview).toBe(0);
  expect(new Set(emptyPreview.ids)).toEqual(new Set(ids));
  const source = insertMarkdownGallery('Text', emptyPreview.ids, 0);
  expect(markdownGalleries(source)[0]).toMatchObject({ ids: emptyPreview.ids, preview: 0 });
  expect(toggleGalleryImage(emptyPreview, emptyPreview.ids[3]!)).toMatchObject({
    preview: 1,
    ids: [emptyPreview.ids[3], ...emptyPreview.ids.filter((_, index) => index !== 3)]
  });
});

test('gallery parsing ignores code examples and retains the preview limit', () => {
  const example = ':::gallery preview=1\nfile:example12\n:::';
  const source = '```md\n' + example + '\n```\n\n' + insertMarkdownGallery('', ids, 999);
  expect(markdownGalleries(source)).toHaveLength(1);
  expect(markdownGalleries(source)[0]).toMatchObject({ ids, preview: 5 });
  const many = Array.from({ length: 32 }, (_, index) => `image${String(index).padStart(4, '0')}`);
  const state = { ids: many, preview: 30 };
  expect(toggleGalleryImage(state, many[31]!)).toBe(state);
});
