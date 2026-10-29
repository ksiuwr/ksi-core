import { describe, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import { renderMarkdown } from './markdown';
import {
  parseReference,
  referenceExtension,
  referenceHref,
  referenceMayFollow,
  referenceScopeForPath
} from './markdown-references';

const { document } = new JSDOM('').window;
function render(source: string, referenceScope: string | null = 'current') {
  const template = document.createElement('template');
  template.innerHTML = renderMarkdown(source, { referenceScope: referenceScope ?? undefined })
    .map((block) => (block.type === 'html' ? block.html : ''))
    .join('');
  return template.content;
}
function references(source: string, referenceScope?: string | null) {
  return [
    ...render(source, referenceScope).querySelectorAll<HTMLAnchorElement>('a.reference-link')
  ].map((link) => ({
    text: link.textContent,
    kind: link.dataset.referenceKind,
    scope: link.dataset.referenceScope,
    number: link.dataset.referenceNumber,
    href: link.getAttribute('href')
  }));
}
const texts = (source: string) => references(source).map((reference) => reference.text);

describe('reference syntax', () => {
  test('each form resolves its workspace without a server lookup', () => {
    expect(parseReference('#12 rest', 'current')).toEqual({
      kind: 'local',
      scope: 'current',
      number: 12,
      raw: '#12'
    });
    expect(parseReference('##3', 'current')).toEqual({
      kind: 'association',
      scope: '~association',
      number: 3,
      raw: '##3'
    });
    expect(parseReference('#ksi-core/34', 'current')).toEqual({
      kind: 'workspace',
      scope: 'ksi-core',
      number: 34,
      raw: '#ksi-core/34'
    });
    expect(parseReference('#123456789', 'current')?.number).toBe(123456789);
  });

  test('numbers must be positive, at most nine digits and end at a boundary', () => {
    for (const source of [
      '#27abc',
      '#12_',
      '#12ą',
      '#0',
      '#01',
      '##0',
      '#1234567890',
      '#',
      '##',
      'x#1',
      '#Ksi/1',
      '#ksi-/1',
      '#ksi--core/1',
      '#-ksi/1',
      '#ksi/0',
      '#ksi/',
      '#ksi/12/3'
    ])
      expect(parseReference(source, 'current')).toBeNull();
    for (const [source, raw] of [
      ['#12.', '#12'],
      ['#12, then', '#12'],
      ['#12)', '#12'],
      ['#12-', '#12'],
      ['##12:', '##12'],
      ['#a-b/7?', '#a-b/7']
    ])
      expect(parseReference(source!, 'current')?.raw).toBe(raw);
  });

  test('a reference cannot follow word characters, slashes, hashes or ampersands', () => {
    for (const previous of ['a', 'Z', '7', '_', 'ś', '/', '#', '&'])
      expect(referenceMayFollow(previous)).toBe(false);
    for (const previous of [undefined, ' ', '(', '[', '"', '*', '-', ',', '\n'])
      expect(referenceMayFollow(previous)).toBe(true);
  });

  test('dashboard paths and scopes map to reference targets', () => {
    expect(referenceScopeForPath('/projects/ksi-core/tasks/4')).toBe('ksi-core');
    expect(referenceScopeForPath('/projects/ksi%2Dcore')).toBe('ksi-core');
    expect(referenceScopeForPath('/association/forum')).toBe('~association');
    expect(referenceScopeForPath('/projects/Bad%20Slug/tasks')).toBe('~association');
    expect(referenceScopeForPath('/projects/%E0%A4%A')).toBe('~association');
    expect(referenceScopeForPath('/')).toBe('~association');
    expect(referenceHref('~association', 5)).toBe('/references/~association/5');
    expect(referenceHref('ksi-core', '12')).toBe('/references/ksi-core/12');
    expect(() => referenceExtension('Not a slug')).toThrow();
  });
});

describe('reference rendering', () => {
  test('links carry kind, workspace and number data for hover previews', () => {
    expect(references('Fixes #12, see #ksi-core/34 and ##5.')).toEqual([
      {
        text: '#12',
        kind: 'local',
        scope: 'current',
        number: '12',
        href: '/references/current/12'
      },
      {
        text: '#ksi-core/34',
        kind: 'workspace',
        scope: 'ksi-core',
        number: '34',
        href: '/references/ksi-core/34'
      },
      {
        text: '##5',
        kind: 'association',
        scope: '~association',
        number: '5',
        href: '/references/~association/5'
      }
    ]);
    expect(references('#7', '~association')[0]).toMatchObject({
      scope: '~association',
      href: '/references/~association/7'
    });
  });

  test('references stay text without a workspace, as on the public website', () => {
    expect(references('#12 ##3 #ksi/4', null)).toEqual([]);
    expect(render('#12 ##3', null).textContent).toContain('#12 ##3');
  });

  test('words, entities and repeated hashes before a reference keep it literal', () => {
    expect(texts('a#27')).toEqual([]);
    expect(texts('issue#12 and x a#27')).toEqual([]);
    expect(texts('zadanie#12 ś#3')).toEqual([]);
    expect(texts('path/#12')).toEqual([]);
    expect(texts('###12')).toEqual([]);
    expect(texts('snake_#12')).toEqual([]);
    const entity = render('It&#39;s &#35;12 &#x23;5');
    expect(entity.textContent).toContain("It's #12 #5");
    expect(entity.querySelector('a')).toBeNull();
  });

  test('punctuation around references is a boundary', () => {
    expect(texts('(#12) [#13] "#14" #15, #16. *#17* **#18**:')).toEqual([
      '#12',
      '#13',
      '#14',
      '#15',
      '#16',
      '#17',
      '#18'
    ]);
    expect(texts('#12abc #13_x #14/x')).toEqual([]);
  });

  test('headings need a space, so references at the start of a line are not headings', () => {
    const headings = render('# Title\n\n## Section #4\n\n# 27\n\n#27 fixed\n\n##3 too');
    expect(headings.querySelector('h1')?.textContent).toBe('Title');
    expect(headings.querySelector('h2')?.textContent).toBe('Section #4');
    expect(headings.querySelectorAll('h1')[1]?.textContent).toBe('27');
    expect([...headings.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      '#27 fixed',
      '##3 too'
    ]);
    expect(texts('# Title\n\n## Section #4\n\n# 27\n\n#27 fixed\n\n##3 too')).toEqual([
      '#4',
      '#27',
      '##3'
    ]);
    expect(texts('#Title and #title')).toEqual([]);
  });

  test('code, links, URLs and raw HTML code are never linkified', () => {
    const source = [
      '`#1` and ``#2 ##3``',
      '```md\n#4 ##5\n```',
      '    #6 indented',
      '<code>#7</code> <kbd>#8</kbd>',
      '[label #9](https://example.test) <a href="https://example.test">#10</a>',
      'https://example.test/issues#11 https://example.test/#12 <https://example.test/#13> www.example.test/#14',
      '<div>\n#15\n</div>',
      '\\#16 and #17'
    ].join('\n\n');
    expect(texts(source)).toEqual(['#17']);
    const html = render(source);
    expect(html.querySelector('a[href="https://example.test/issues#11"]')).not.toBeNull();
    expect(html.querySelector('a[href="https://example.test/#12"]')).not.toBeNull();
    expect(html.querySelector('a[href="http://www.example.test/#14"]')).not.toBeNull();
  });

  test('references work in lists, tables, quotes and emphasis', () => {
    expect(texts('- #1\n- [ ] ##2\n\n| A | B |\n|---|---|\n| #3 | #ksi/4 |\n\n> #5 _#6_')).toEqual([
      '#1',
      '##2',
      '#3',
      '#ksi/4',
      '#5',
      '#6'
    ]);
  });
});
