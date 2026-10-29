import { describe, expect, test } from 'bun:test';
import type { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
import { renderMarkdown, type MarkdownBlock } from './markdown';
import { createDomPurifySanitizer } from './markdown.browser';
import { createMarkdownRenderer } from './markdown-core';

const { window } = new JSDOM('');
const renderInBrowser = createMarkdownRenderer(
  createDomPurifySanitizer(window as unknown as WindowLike)
);
const html = (blocks: MarkdownBlock[]) =>
  blocks.map((block) => (block.type === 'html' ? block.html : '')).join('');
// The sanitizers serialize differently (`<br />` and `<br>`), so compare the DOM they produce.
const dom = (blocks: MarkdownBlock[]) =>
  blocks.map((block) => {
    if (block.type !== 'html') return block;
    const template = window.document.createElement('template');
    template.innerHTML = block.html;
    return { type: 'html', html: template.innerHTML };
  });
const rel = 'rel="noopener noreferrer external"';
const reference = (kind: string, scope: string, number: number, text: string) =>
  `<a class="reference-link" data-sveltekit-reload data-sveltekit-preload-data="off" data-reference-kind="${kind}" data-reference-scope="${scope}" data-reference-number="${number}" href="/references/${scope}/${number}" ${rel}>${text}</a>`;

// Output of the previous server-only renderer (the `/markdown` endpoint) for typical
// documents. References now also carry `data-reference-kind`; nothing else changed.
const documents: { name: string; source: string; scope?: string; expected: MarkdownBlock[] }[] = [
  {
    name: 'headings, emphasis and links',
    source:
      '# Title\n\nIntro with **bold**, _em_, ~~del~~ and `code`.\n\n## Section\n\nSee [docs](https://example.com/docs "Docs"), <https://ksi.edu.pl> and mail@ksi.edu.pl.',
    expected: [
      {
        type: 'html',
        html: `<h1>Title</h1>\n<p>Intro with <strong>bold</strong>, <em>em</em>, del and <code>code</code>.</p>\n<h2>Section</h2>\n<p>See <a href="https://example.com/docs" title="Docs" ${rel}>docs</a>, <a href="https://ksi.edu.pl" ${rel}>https://ksi.edu.pl</a> and <a href="mailto:mail@ksi.edu.pl" ${rel}>mail@ksi.edu.pl</a>.</p>\n`
      }
    ]
  },
  {
    name: 'lists, quotes and rules',
    source: '- one\n- two\n  1. nested\n  2. items\n\n> quoted **text**\n\n---\n\nline  \nbreak',
    expected: [
      {
        type: 'html',
        html: '<ul>\n<li>one</li>\n<li>two<ol>\n<li>nested</li>\n<li>items</li>\n</ol>\n</li>\n</ul>\n<blockquote>\n<p>quoted <strong>text</strong></p>\n</blockquote>\n<hr />\n<p>line<br />break</p>\n'
      }
    ]
  },
  {
    name: 'code blocks and spans',
    source: '```ts\nconst a = \'<b>\' && "x";\n```\n\nInline `a < b` code.\n\n    indented code',
    expected: [
      {
        type: 'html',
        html: '<pre><code class="language-ts">const a = \'&lt;b&gt;\' &amp;&amp; "x";\n</code></pre>\n<p>Inline <code>a &lt; b</code> code.</p>\n<pre><code>indented code\n</code></pre>\n'
      }
    ]
  },
  {
    name: 'table',
    source: '| A | B |\n|:--|--:|\n| 1 | **2** |\n| `x` | [y](https://y.test) |',
    expected: [
      {
        type: 'html',
        html: `<table>\n<thead>\n<tr>\n<th>A</th>\n<th>B</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td><strong>2</strong></td>\n</tr>\n<tr>\n<td><code>x</code></td>\n<td><a href="https://y.test" ${rel}>y</a></td>\n</tr>\n</tbody></table>\n`
      }
    ]
  },
  {
    name: 'images and attachments',
    source:
      'Before ![Diagram](file:image_123 "Caption"){width=320} after.\n\n![External](https://img.test/a.png)\n\n[report.pdf](file:document123)',
    expected: [
      {
        type: 'html',
        html: `<p>Before <span class="markdown-image-frame"><img src="/media/image_123" alt="Diagram" title="Caption" width="320" data-ksi-image="0" /></span> after.</p>\n<p><span class="markdown-image-frame"><img src="https://img.test/a.png" alt="External" data-ksi-image="1" /></span></p>\n<p><a href="/media/document123" ${rel}>report.pdf</a></p>\n`
      }
    ]
  },
  {
    name: 'gallery between paragraphs',
    source:
      'Intro\n\n:::gallery preview=2\nfile:abcdefgh\nfile:ijklmnop\nfile:qrstuvwx\n:::\n\nOutro',
    expected: [
      { type: 'html', html: '<p>Intro</p>\n' },
      { type: 'gallery', ids: ['abcdefgh', 'ijklmnop', 'qrstuvwx'], preview: 2 },
      { type: 'html', html: '<p>Outro</p>\n' }
    ]
  },
  {
    name: 'scoped references',
    source:
      'Fixes #12, relates to #ksi-core/34 and ##5.\n\n## Follow-up for #7\n\n- [ ] #8 pending',
    scope: 'current-project',
    expected: [
      {
        type: 'html',
        html: `<p>Fixes ${reference('local', 'current-project', 12, '#12')}, relates to ${reference('workspace', 'ksi-core', 34, '#ksi-core/34')} and ${reference('association', '~association', 5, '##5')}.</p>\n<h2>Follow-up for ${reference('local', 'current-project', 7, '#7')}</h2>\n<ul>\n<li> ${reference('local', 'current-project', 8, '#8')} pending</li>\n</ul>\n`
      }
    ]
  },
  {
    name: 'references without scope',
    source: 'Public #12 stays text.',
    expected: [{ type: 'html', html: '<p>Public #12 stays text.</p>\n' }]
  },
  {
    name: 'mentions',
    source: 'Thanks [@Jan Kowalski](/members/abc123)!',
    expected: [
      {
        type: 'html',
        html: `<p>Thanks <a href="/members/abc123" ${rel}>@Jan Kowalski</a>!</p>\n`
      }
    ]
  },
  {
    name: 'allowed inline html',
    source: 'Press <kbd>Ctrl</kbd> + <kbd>C</kbd>, H<sub>2</sub>O, <mark>note</mark>.',
    expected: [
      {
        type: 'html',
        html: '<p>Press <kbd>Ctrl</kbd> + <kbd>C</kbd>, H<sub>2</sub>O, <mark>note</mark>.</p>\n'
      }
    ]
  },
  {
    name: 'escaping',
    source: 'He said "hi" & \'bye\' <3 > 2',
    expected: [{ type: 'html', html: '<p>He said "hi" &amp; \'bye\' &lt;3 &gt; 2</p>\n' }]
  }
];

describe('typical documents', () => {
  for (const document of documents) {
    const options = { referenceScope: document.scope };
    test(`${document.name}: server output matches the previous renderer`, () => {
      expect(renderMarkdown(document.source, options)).toEqual(document.expected);
    });
    test(`${document.name}: browser and server render the same document`, () => {
      expect(dom(renderInBrowser(document.source, options))).toEqual(
        dom(renderMarkdown(document.source, options))
      );
    });
  }
});

test('code blocks keep only language classes', () => {
  const output = html(
    renderMarkdown('```ts\nconst x = 1;\n```\n\n<code class="fixed inset-0 z-90">overlay</code>')
  );
  expect(output).toContain('class="language-ts"');
  expect(output).not.toContain('inset-0');
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
  expect(renderInBrowser(source)).toEqual(renderMarkdown(source));
});

test('uploads resolve to media paths in links and images but stay literal in prose and code', () => {
  const source =
    '[report](file:document123) ![photo](file:image_123) ![ref][pic]\n\nUse `file:abcdefgh` or file:abcdefgh.\n\n```md\n![x](file:image_123)\n```\n\n[pic]: file:image_456';
  for (const render of [renderMarkdown, renderInBrowser]) {
    const output = html(render(source));
    expect(output).toContain('href="/media/document123"');
    expect(output).toContain('src="/media/image_123"');
    expect(output).toContain('src="/media/image_456"');
    expect(output).toContain('<code>file:abcdefgh</code> or file:abcdefgh.');
    expect(output).toContain('![x](file:image_123)');
    expect(output).not.toContain('/media/abcdefgh');
  }
});

test('the browser renderer refuses to run without a DOM instead of returning raw HTML', () => {
  expect(() => createDomPurifySanitizer({} as WindowLike)).toThrow();
});
