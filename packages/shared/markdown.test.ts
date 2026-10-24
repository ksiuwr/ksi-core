import { expect, test } from 'bun:test';
import { renderMarkdown } from './markdown';
test('markdown cannot execute scripts or unsafe links', () => {
  const blocks = renderMarkdown(
    '<script>alert(1)</script>\n[x](javascript:alert(1))\n<img src=x onerror=alert(1)>'
  );
  const html = blocks
    .filter((b) => b.type === 'html')
    .map((b) => b.html)
    .join('');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('onerror');
  expect(html).not.toContain('javascript:');
});
test('code blocks keep only language classes', () => {
  const html = renderMarkdown(
    '```ts\nconst x = 1;\n```\n\n<code class="fixed inset-0 z-90">overlay</code>'
  )
    .map((b) => (b.type === 'html' ? b.html : ''))
    .join('');
  expect(html).toContain('class="language-ts"');
  expect(html).not.toContain('inset-0');
});
test('gallery is allowlisted data with bounded preview', () => {
  const blocks = renderMarkdown(':::gallery preview=999\nfile:abcdefgh file:ijklmnop\n:::');
  const gallery = blocks.find((b) => b.type === 'gallery');
  expect(gallery).toEqual({ type: 'gallery', ids: ['abcdefgh', 'ijklmnop'], preview: 2 });
});

test('gallery preview permits zero selected images and code examples remain literal', () => {
  const source = ':::gallery preview=0\nfile:abcdefgh\n:::';
  expect(renderMarkdown(source).find((block) => block.type === 'gallery')).toEqual({
    type: 'gallery',
    ids: ['abcdefgh'],
    preview: 0
  });
  expect(
    renderMarkdown('```md\n' + source + '\n```').some((block) => block.type === 'gallery')
  ).toBe(false);
});
