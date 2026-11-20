import { expect, test } from 'bun:test';
import {
  insertMarkdownGallery,
  markdownGalleries,
  updateMarkdownGallery,
  toggleGalleryImage,
  removeGalleryImage,
  moveGalleryImage,
  setGalleryImageDescription
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

test('descriptions round-trip through insertion and parsing', () => {
  const source = insertMarkdownGallery('Text', ['image1111', 'image2222', 'image3333'], 2, {
    image1111: 'Warsztaty z robotyki w sali 104',
    image2222: '   ',
    outside123: 'not in the gallery'
  });
  expect(source).toContain(
    ':::gallery preview=2\nfile:image1111 | Warsztaty z robotyki w sali 104\nfile:image2222\nfile:image3333\n:::'
  );
  expect(markdownGalleries(source)[0]).toMatchObject({
    ids: ['image1111', 'image2222', 'image3333'],
    preview: 2,
    descriptions: { image1111: 'Warsztaty z robotyki w sali 104' }
  });
});

test('galleries without descriptions omit the field entirely', () => {
  const parsed = markdownGalleries(
    ':::gallery preview=1\nfile:abcdefgh\nfile:ijklmnop   \n:::'
  )[0]!;
  expect(parsed).toEqual({
    start: expect.any(Number),
    end: expect.any(Number),
    ids: ['abcdefgh', 'ijklmnop'],
    preview: 1
  });
  const empty = insertMarkdownGallery('', ['abcdefgh'], 1, { abcdefgh: '  ' });
  expect(empty).toContain('file:abcdefgh\n:::');
  expect(markdownGalleries(empty)[0]).not.toHaveProperty('descriptions');
});

test('multi-id lines with spaces or commas keep their original behaviour', () => {
  const source =
    ':::gallery preview=9\nfile:abcdefgh file:ijklmnop\nfile:qrstuvwx, file:yzabcdefg\nfile:abcdefgh\n:::';
  const parsed = markdownGalleries(source)[0]!;
  expect(parsed).toMatchObject({
    ids: ['abcdefgh', 'ijklmnop', 'qrstuvwx', 'yzabcdefg'],
    preview: 4
  });
  expect(parsed).not.toHaveProperty('descriptions');
});

test('the first description wins for duplicate ids and file: text stays descriptive', () => {
  const source =
    ':::gallery preview=1\nfile:abcdefgh pierwszy opis\nfile:abcdefgh drugi opis\nfile:ijklmnop Zobacz file:qrstuvwx w tle\n:::';
  expect(markdownGalleries(source)[0]).toMatchObject({
    ids: ['abcdefgh', 'ijklmnop'],
    preview: 1,
    descriptions: { abcdefgh: 'pierwszy opis', ijklmnop: 'Zobacz file:qrstuvwx w tle' }
  });
});

test('malformed lines still contribute their ids gracefully', () => {
  const source = ':::gallery preview=2\nnot an image line file:abcdefgh\nfile:ijklmnop, opis\n:::';
  expect(markdownGalleries(source)[0]).toMatchObject({
    ids: ['abcdefgh', 'ijklmnop'],
    preview: 2
  });
});

test('toggling and reordering keep descriptions attached to their images', () => {
  const state = {
    ids,
    preview: 3,
    descriptions: { image1111: 'pierwsze', image4444: 'czwarte' }
  };
  expect(toggleGalleryImage(state, ids[1]!)).toEqual({
    ids: [ids[0], ids[2], ids[1], ids[3], ids[4]],
    preview: 2,
    descriptions: { image1111: 'pierwsze', image4444: 'czwarte' }
  });
  expect(moveGalleryImage(state, ids[0]!, 2)).toEqual({
    ids: [ids[1], ids[2], ids[0], ids[3], ids[4]],
    preview: 3,
    descriptions: { image1111: 'pierwsze', image4444: 'czwarte' }
  });
});

test('removal drops the description and omits the field when none remain', () => {
  const state = {
    ids,
    preview: 3,
    descriptions: { image1111: 'pierwsze', image4444: 'czwarte' }
  };
  const removed = removeGalleryImage(state, ids[0]!);
  expect(removed).toEqual({
    ids: ids.slice(1),
    preview: 2,
    descriptions: { image4444: 'czwarte' }
  });
  const last = removeGalleryImage(removed, ids[3]!);
  expect(last).toEqual({ ids: [ids[1], ids[2], ids[4]], preview: 2 });
  expect(last).not.toHaveProperty('descriptions');
});

test('setGalleryImageDescription sanitizes, updates and clears descriptions', () => {
  const state = { ids: ['image1111', 'image2222'], preview: 1 };
  const described = setGalleryImageDescription(state, 'image1111', '  line one\r\nline two  ');
  expect(described).toEqual({
    ids: state.ids,
    preview: 1,
    descriptions: { image1111: 'line one line two' }
  });
  const updated = setGalleryImageDescription(described, 'image1111', 'nowy opis');
  expect(updated.descriptions).toEqual({ image1111: 'nowy opis' });
  const cleared = setGalleryImageDescription(updated, 'image1111', '   ');
  expect(cleared).toEqual({ ids: state.ids, preview: 1 });
  expect(cleared).not.toHaveProperty('descriptions');
  expect(setGalleryImageDescription(state, 'missing123', 'opis')).toBe(state);
  const long = setGalleryImageDescription(state, 'image2222', 'x'.repeat(600));
  expect(long.descriptions!.image2222).toHaveLength(500);
});

test('descriptions cannot inject lines or break out of the gallery block', () => {
  const state = setGalleryImageDescription(
    { ids: ['image1111'], preview: 1 },
    'image1111',
    'opis\n:::\nfile:image2222 sneak\n:::gallery preview=0'
  );
  const source = insertMarkdownGallery('Text', state.ids, state.preview, state.descriptions);
  const parsed = markdownGalleries(source);
  expect(parsed).toHaveLength(1);
  expect(parsed[0]).toMatchObject({
    ids: ['image1111'],
    preview: 1,
    descriptions: { image1111: 'opis ::: file:image2222 sneak :::gallery preview=0' }
  });
});

test('updateMarkdownGallery preserves and rewrites descriptions', () => {
  const source = insertMarkdownGallery('Before', ids, 3, { image2222: 'Opis' });
  const state = markdownGalleries(source)[0]!;
  const changed = updateMarkdownGallery(
    source,
    0,
    setGalleryImageDescription(state, 'image3333', 'Drugi opis')
  );
  expect(markdownGalleries(changed)[0]).toMatchObject({
    ids,
    preview: 3,
    descriptions: { image2222: 'Opis', image3333: 'Drugi opis' }
  });
  const stripped = updateMarkdownGallery(changed, 0, { ids, preview: 3 });
  expect(markdownGalleries(stripped)[0]).not.toHaveProperty('descriptions');
  expect(stripped).toContain('Before');
});

test('descriptions that look like file: tokens round-trip without creating phantom images', () => {
  const source = insertMarkdownGallery('', ['image1111'], 1, {
    image1111: 'file:abcd1234'
  });
  expect(markdownGalleries(source)[0]).toMatchObject({
    ids: ['image1111'],
    preview: 1,
    descriptions: { image1111: 'file:abcd1234' }
  });
});

test('legacy multi-id lines with trailing text keep extracting every id', () => {
  const parsed = markdownGalleries(
    ':::gallery preview=2\nfile:abcdefgh file:ijklmnop uwaga\n:::'
  )[0]!;
  expect(parsed).toMatchObject({
    ids: ['abcdefgh', 'ijklmnop'],
    preview: 2
  });
  expect(parsed).not.toHaveProperty('descriptions');
});

test('Unicode line separators collapse cleanly and 500-char cap preserves surrogate pairs', () => {
  const source = insertMarkdownGallery('', ['image1111', 'image2222'], 2, {
    image1111: 'a\u2028b\u2029c',
    image2222: 'x'.repeat(499) + '😀trailing'
  });
  const parsed = markdownGalleries(source)[0]!;
  expect(parsed.descriptions?.image1111).toBe('a b c');
  expect(parsed.descriptions?.image2222).toBe('x'.repeat(499) + '😀');
  expect(Array.from(parsed.descriptions!.image2222!)).toHaveLength(500);
});
