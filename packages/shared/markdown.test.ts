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

test('numeric references link current, explicit and association scopes without rewriting code or existing links', () => {
  const html = renderMarkdown(
    '#12 #ksi-core/34 ##56 `#78` [label #90](https://example.com)\n\n```md\n#123\n```',
    'current-project'
  )
    .map((block) => (block.type === 'html' ? block.html : ''))
    .join('');
  expect(html).toContain('href="/references/current-project/12"');
  expect(html).toContain('href="/references/ksi-core/34"');
  expect(html).toContain('href="/references/~association/56"');
  expect(html).not.toContain('/references/current-project/78');
  expect(html).not.toContain('/references/current-project/90');
  expect(html).not.toContain('/references/current-project/123');
});

test('numeric references stay literal without a dashboard scope and require a word boundary', () => {
  const plain = renderMarkdown('#12 and (#34)')
    .map((block) => (block.type === 'html' ? block.html : ''))
    .join('');
  expect(plain).not.toContain('/references/');
  expect(plain).toContain('#12');

  const scoped = renderMarkdown('issue#12 (#34)', 'current-project')
    .map((block) => (block.type === 'html' ? block.html : ''))
    .join('');
  expect(scoped).not.toContain('/references/current-project/12');
  expect(scoped).toContain('href="/references/current-project/34"');
});
