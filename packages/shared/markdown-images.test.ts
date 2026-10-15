import { expect, test } from 'bun:test';
import { markdownImages, prepareMarkdownImages, resizeMarkdownImage } from './markdown-images';
import { renderMarkdown } from './markdown';
test('resize flags round-trip without altering other images, titles or prose', () => {
  const source =
    'Example `![code](https://a.test/x)`\n![First](file:image_123 "Caption")\n![Second](https://a.test/x){width=250}';
  expect(markdownImages(source)).toHaveLength(2);
  const resized = resizeMarkdownImage(source, 1, 400);
  expect(resized).toEndWith('![Second](https://a.test/x){width=400}');
  expect(resizeMarkdownImage(resized, 1, 500)).toEndWith('{width=500}');
  expect(resizeMarkdownImage(source, 0, NaN)).toBe(source);
});
test('code fences stay literal and image rendering clamps dimensions and rejects executable URLs', () => {
  const source =
    '```md\n![example](file:image_123)\n```\n![Real](file:image_123){width=99999}\n![Unsafe](javascript:alert){width=1}';
  expect(markdownImages(source)).toHaveLength(2);
  const html = renderMarkdown(source)
    .filter((block) => block.type === 'html')
    .map((block) => block.html)
    .join('');
  expect(html).toContain('width="2000"');
  expect(html).toContain('width="32"');
  expect(html).not.toContain('src="javascript:');
  expect(html).toContain('src="/media/image_123"');
});

test('image URLs with parentheses and escaped alt text keep their Markdown intact', () => {
  const source = '![A \\] label](https://example.test/a_(b).png "A title"){width=300}';
  expect(markdownImages(source)).toHaveLength(1);
  expect(resizeMarkdownImage(source, 0, 420)).toBe(source.replace('width=300', 'width=420'));
});

test('documents with many images are processed and nested images render once', () => {
  const source = '![x](file:image_123){width=200} '.repeat(15000);
  expect(markdownImages(source)).toHaveLength(15000);
  expect(prepareMarkdownImages(source).match(/<img/g)).toHaveLength(15000);
  const nested = renderMarkdown('![![inner](https://a.test/i)](https://a.test/o)')
    .map((block) => (block.type === 'html' ? block.html : ''))
    .join('');
  expect(nested.match(/<img/g)).toHaveLength(1);
  expect(nested).toContain('src="https://a.test/o"');
});
