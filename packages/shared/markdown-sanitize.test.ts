import { describe, expect, test } from 'bun:test';
import type { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
import sanitizeHtml from 'sanitize-html';
import { renderMarkdown, type MarkdownBlock } from './markdown';
import { createDomPurifySanitizer } from './markdown.browser';
import { createMarkdownRenderer } from './markdown-core';
import {
  allowedMarkdownClasses,
  finalizeMarkdownAttributes,
  isAllowedMarkdownUrl,
  markdownPolicy
} from './markdown-policy';

const { window } = new JSDOM('');
const renderers = {
  server: renderMarkdown,
  browser: createMarkdownRenderer(createDomPurifySanitizer(window as unknown as WindowLike))
};
// Parse the output the way a browser would before it reaches the page.
function parse(blocks: MarkdownBlock[]) {
  const template = window.document.createElement('template');
  template.innerHTML = blocks.map((block) => (block.type === 'html' ? block.html : '')).join('');
  return template;
}
function expectPolicy(template: HTMLTemplateElement) {
  for (const element of template.content.querySelectorAll('*')) {
    const tag = element.localName;
    expect(markdownPolicy.tags).toContain(tag);
    for (const { name, value } of element.attributes) {
      expect(markdownPolicy.attributes[tag] ?? []).toContain(name);
      if (name === 'href' || name === 'src') expect(isAllowedMarkdownUrl(tag, value)).toBe(true);
      if (name === 'class') expect(allowedMarkdownClasses(tag, value)).toBe(value);
    }
  }
}

const vectors = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<img src="javascript:alert(1)">',
  '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
  '![x](data:image/png;base64,AAAA)',
  '![x](javascript:alert(1))',
  '[x](javascript:alert(1))',
  '[x](JaVaScRiPt:alert(1))',
  '[x](vbscript:msgbox(1))',
  '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '[x](<javascript:alert(1)>)',
  '<javascript:alert(1)>',
  '[x][evil]\n\n[evil]: javascript:alert(1)',
  '<a href="&#106;avascript:alert(1)">x</a>',
  '<a href="java&#x09;script:alert(1)">x</a>',
  '<a href="java\nscript:alert(1)">x</a>',
  '<a href=" javascript:alert(1)">x</a>',
  '<a href="jav<!-- -->ascript:alert(1)">x</a>',
  '<a href="//evil.test/x">x</a>',
  '<a href="\\\\evil.test/x">x</a>',
  '[x](//evil.test)',
  '<a href="https://ok.test" onclick="alert(1)" target="_blank" style="color:red" id="x" name="y" data-x="1">x</a>',
  '[x](https://ok.test "\\" onmouseover=\\"alert(1)")',
  '![" onerror="alert(1)](https://ok.test/a.png)',
  '![x](https://ok.test/a.png "\\" onerror=\\"alert(1)"){width=10}',
  '<iframe src="https://evil.test">t</iframe>',
  '<object data="https://evil.test">o</object><embed src="https://evil.test">',
  '<form action="https://evil.test"><input name="x"><button formaction="javascript:alert(1)">go</button></form>',
  '<svg onload=alert(1)><circle /></svg>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>',
  '<svg><p><style><img src=x onerror=alert(1)></style></p></svg>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
  '<style>body{background:url(javascript:alert(1))}</style>',
  '<div style="background:url(javascript:alert(1))">x</div>',
  '<link rel="stylesheet" href="https://evil.test/x.css"><meta http-equiv="refresh" content="0;url=https://evil.test"><base href="https://evil.test/">',
  '<details open ontoggle=alert(1)>x</details>',
  '<textarea><img src=x onerror=alert(1)></textarea>',
  '<template><img src=x onerror=alert(1)></template>',
  '<!--<img src=x onerror=alert(1)>-->',
  '<scr<script>ipt>alert(1)</script>',
  '`<script>alert(1)</script>`\n\n```html\n<script>alert(1)</script>\n```',
  '<img src="https://ok.test/a.png" srcset="javascript:alert(1)" width="abc" data-ksi-image="1 onerror">',
  '<a href="https://evil.test" class="reference-link" data-reference-kind="local" data-reference-scope="ksi" data-reference-number="1">#1</a>',
  '<span class="markdown-image-frame fixed inset-0">x</span>',
  '<a href="mailto:x@y.test">m</a><a href="tel:123">t</a><a href="ftp://x.test">f</a>'
];
// The parsers recover from these malformed documents differently; both results are inert.
const parserDifferentials = new Set([
  '<svg><p><style><img src=x onerror=alert(1)></style></p></svg>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>'
]);

describe('both sanitizers enforce the policy on hostile input', () => {
  for (const vector of vectors) {
    test(JSON.stringify(vector), () => {
      const outputs = Object.values(renderers).map((render) =>
        parse(render(vector, { referenceScope: 'ksi' }))
      );
      for (const output of outputs) {
        expectPolicy(output);
        expect(output.innerHTML.toLowerCase()).not.toMatch(/<script|<style|<iframe|<svg|<math/);
      }
      if (!parserDifferentials.has(vector))
        expect(outputs[1]!.innerHTML).toBe(outputs[0]!.innerHTML);
    });
  }
});

describe('policy details', () => {
  test('the allowlist is sanitize-html defaults plus images, strikethrough and checkboxes', () => {
    expect([...markdownPolicy.tags].sort()).toEqual(
      [...sanitizeHtml.defaults.allowedTags, 'img', 'del', 'input'].sort()
    );
  });

  test('URLs allow relative paths and allowlisted schemes only', () => {
    for (const url of [
      '/media/x',
      'page',
      '#anchor',
      '?q=1',
      'https://a.test',
      'HTTP://a.test',
      'mailto:a@b.test'
    ])
      expect(isAllowedMarkdownUrl('a', url)).toBe(true);
    for (const url of [
      'javascript:alert(1)',
      ' JAVASCRIPT:alert(1)',
      'java\tscript:alert(1)',
      'java\u0000script:alert(1)',
      'jav<!-- x -->ascript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'file:abcdefgh',
      'tel:123',
      '//evil.test',
      '\\\\evil.test',
      '/\\evil.test'
    ])
      expect(isAllowedMarkdownUrl('a', url)).toBe(false);
    expect(isAllowedMarkdownUrl('img', 'mailto:a@b.test')).toBe(false);
    expect(isAllowedMarkdownUrl('img', 'https://a.test/x.png')).toBe(true);
  });

  test('classes are filtered per element', () => {
    expect(allowedMarkdownClasses('code', 'language-ts fixed inset-0')).toBe('language-ts');
    expect(allowedMarkdownClasses('span', 'markdown-image-frame evil')).toBe(
      'markdown-image-frame'
    );
    expect(allowedMarkdownClasses('div', 'markdown-image-frame')).toBe('');
  });

  test('links always get rel and only genuine references keep reference styling', () => {
    const genuine = {
      href: '/references/ksi/1',
      class: 'reference-link',
      'data-reference-kind': 'local',
      'data-reference-scope': 'ksi',
      'data-reference-number': '1'
    };
    expect(finalizeMarkdownAttributes('a', genuine)).toEqual({
      ...genuine,
      rel: 'noopener noreferrer external'
    });
    for (const forged of [
      { ...genuine, href: 'https://evil.test' },
      { ...genuine, 'data-reference-number': '01', href: '/references/ksi/01' },
      { ...genuine, 'data-reference-scope': 'Bad', href: '/references/Bad/1' },
      { ...genuine, 'data-reference-kind': 'other' }
    ])
      expect(finalizeMarkdownAttributes('a', forged)).toEqual({
        href: forged.href,
        rel: 'noopener noreferrer external'
      });
    expect(finalizeMarkdownAttributes('a', { href: 'https://a.test', rel: 'opener' }).rel).toBe(
      'noopener noreferrer external'
    );
  });

  test('image widths are clamped and image indexes must be numeric', () => {
    expect(finalizeMarkdownAttributes('img', { width: '99999', 'data-ksi-image': '3' })).toEqual({
      width: '2000',
      'data-ksi-image': '3'
    });
    expect(finalizeMarkdownAttributes('img', { width: '1', 'data-ksi-image': 'x' })).toEqual({
      width: '32'
    });
    expect(finalizeMarkdownAttributes('img', { width: '50%' })).toEqual({});
  });

  test('forged reference links and unsafe attributes are neutralized end to end', () => {
    for (const render of Object.values(renderers)) {
      const forged = parse(render(vectors.find((vector) => vector.includes('evil.test" class'))!));
      const link = forged.content.querySelector('a')!;
      expect(link.getAttribute('href')).toBe('https://evil.test');
      expect(link.className).toBe('');
      expect(link.hasAttribute('data-reference-scope')).toBe(false);

      const external = parse(
        render('<a href="https://ok.test" target="_blank" onclick="x()">x</a>')
      );
      const anchor = external.content.querySelector('a')!;
      expect([...anchor.attributes].map((attribute) => attribute.name).sort()).toEqual([
        'href',
        'rel'
      ]);
      expect(anchor.rel).toBe('noopener noreferrer external');

      const image = parse(render('![" onerror="alert(1)](https://ok.test/a.png){width=99999}'));
      const img = image.content.querySelector('img')!;
      expect(img.getAttribute('alt')).toBe('" onerror="alert(1)');
      expect(img.getAttribute('width')).toBe('2000');
      expect(img.hasAttribute('onerror')).toBe(false);
    }
  });
});
