import { expect, test } from 'bun:test';
import {
  cleanDocTranslations,
  docLineChanges,
  outdatedTranslations,
  docLinkCandidates,
  headingSlug,
  lineChanges,
  markdownBlockDiff,
  markdownHeadings,
  parseDocLinkTarget,
  translatedDocHeading,
  wordDiff,
  type DocTranslations
} from './docs';
import type { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
import { renderMarkdown } from './markdown';
import { createDomPurifySanitizer } from './markdown.browser';
import { createMarkdownRenderer } from './markdown-core';

const html = (blocks: ReturnType<typeof renderMarkdown>) =>
  blocks.map((block) => (block.type === 'html' ? block.html : '')).join('');

test('page link targets separate an optional workspace and heading', () => {
  expect(parseDocLinkTarget('zosia/bus-packing#kitchen')).toEqual({
    raw: 'zosia/bus-packing#kitchen',
    workspace: 'zosia',
    name: 'bus-packing',
    heading: 'kitchen'
  });
  expect(parseDocLinkTarget('Bus packing')).toMatchObject({ workspace: null, name: 'Bus packing' });
  // A title containing a slash is not mistaken for a workspace prefix.
  expect(parseDocLinkTarget('CI/CD setup')).toMatchObject({ workspace: null, name: 'CI/CD setup' });
});

test('link candidates skip Markdown links, images, references and task markers', () => {
  const targets = docLinkCandidates(
    '- [x] packed\n- [ ] cables\nSee [faq], ![logo](file:abcdefgh), [site](https://x.y), [ref][1] and \\[escaped].'
  ).map((target) => target.raw);
  expect(targets).toContain('faq');
  expect(targets).not.toContain('site');
  expect(targets).not.toContain('logo');
  expect(targets).not.toContain('ref');
  expect(targets).not.toContain('escaped');
});

test('documentation rendering resolves page links and leaves code and links alone', () => {
  const rendered = html(
    renderMarkdown(
      'See [faq] and [zosia/day-plan#morning], not `[faq]` or [label](https://example.com).\n\n[missing]',
      {
        docs: {
          resolve: (target) =>
            target.name === 'missing'
              ? null
              : {
                  href: `/docs/${target.workspace ?? 'here'}/${target.name}${target.heading ? `#${target.heading}` : ''}`,
                  label: target.name.toUpperCase(),
                  title: target.name
                }
        }
      }
    )
  );
  expect(rendered).toContain('<a class="doc-link" href="/docs/here/faq" title="faq">FAQ</a>');
  expect(rendered).toContain('href="/docs/zosia/day-plan#morning"');
  expect(rendered).toContain('<code>[faq]</code>');
  expect(rendered).toContain('href="https://example.com" rel="noopener noreferrer external"');
  expect(rendered).toContain('class="doc-link-missing"');
  expect(rendered).not.toContain('doc-link" href="/docs/here/faq" rel=');
});

test('documentation headings get stable unique anchors matching the outline', () => {
  const source = '# Ogólne zasady\n\n## Kuchnia\n\n## Kuchnia\n\n> ### Note *one*';
  const headings = markdownHeadings(source);
  expect(headings).toEqual([
    { level: 1, text: 'Ogólne zasady', id: 'ogolne-zasady' },
    { level: 2, text: 'Kuchnia', id: 'kuchnia' },
    { level: 2, text: 'Kuchnia', id: 'kuchnia-1' },
    { level: 3, text: 'Note one', id: 'note-one' }
  ]);
  const rendered = html(renderMarkdown(source, { docs: { resolve: () => null } }));
  for (const heading of headings) {
    expect(rendered).toContain(`id="section-${heading.id}"`);
    expect(rendered).toContain(`href="#${heading.id}"`);
  }
  expect(headingSlug('Łódź & Wrocław!')).toBe('lodz-wroclaw');
});

test('ordinary markdown drops heading ids but keeps read-only checkboxes and strikethrough', () => {
  const rendered = html(
    renderMarkdown('<h2 id="dashboard-navigation">x</h2>\n\n- [x] done\n- [ ] todo\n\n~~old~~')
  );
  expect(rendered).not.toContain('id=');
  expect(rendered).toContain('<input checked disabled type="checkbox" />');
  expect(rendered).toContain('<input disabled type="checkbox" />');
  expect(rendered).toContain('<del>old</del>');
  // Any other input becomes an inert checkbox rather than a form control.
  const input = html(renderMarkdown('<input type="text" value="x">'));
  expect(input).not.toContain('type="text"');
  expect(input).not.toContain('value=');
});

test('block diff pairs edited blocks and keeps unchanged context', () => {
  const rows = markdownBlockDiff(
    '# Title\n\nIntro\n\n- a\n- b\n\nOld end',
    '# Title\n\nIntro text\n\n- a\n- b\n\nNew block\n\nOld end'
  );
  expect(rows.map((row) => row.kind)).toEqual(['same', 'changed', 'same', 'added', 'same']);
  expect(lineChanges('a\nb\nc', 'a\nB\nc\nd')).toEqual({ additions: 2, deletions: 1 });
  expect(wordDiff('pack the cables', 'pack all cables')).toEqual({
    before: [
      { text: 'pack ', changed: false },
      { text: 'the', changed: true },
      { text: ' cables', changed: false }
    ],
    after: [
      { text: 'pack ', changed: false },
      { text: 'all', changed: true },
      { text: ' cables', changed: false }
    ]
  });
});

test('browsers render documentation links, anchors and checkboxes like the server', () => {
  const { window } = new JSDOM('');
  const renderInBrowser = createMarkdownRenderer(
    createDomPurifySanitizer(window as unknown as WindowLike)
  );
  const dom = (blocks: ReturnType<typeof renderMarkdown>) => {
    const template = window.document.createElement('template');
    template.innerHTML = html(blocks);
    return template.innerHTML;
  };
  const docs = {
    resolve: (target: { name: string }) =>
      target.name === 'faq' ? { href: '/association/docs/faq', label: 'FAQ', title: 'FAQ' } : null
  };
  const source =
    '## Kitchen\n\nSee [faq], [nope] and [out](https://example.com).\n\n- [x] done\n- [ ] ~~todo~~\n\n<h3 id="navigation-toggle">x</h3><a class="doc-link" href="//evil.test">e</a>';
  const server = dom(renderMarkdown(source, { docs }));
  expect(dom(renderInBrowser(source, { docs }))).toBe(server);
  expect(server).toContain('<a class="doc-link" href="/association/docs/faq" title="FAQ">FAQ</a>');
  expect(server).toContain('href="#kitchen"');
  expect(server).not.toContain('navigation-toggle');
  // A raw link dressed as a page link cannot leave the site or skip the external rel.
  expect(server).not.toContain('evil.test');
  expect(server).toContain('<a class="doc-link" rel="noopener noreferrer external">e</a>');
});

test('Polish and translated section references reach the translated outline', () => {
  const source = '## Członkostwo\n\n### Jak dołączyć?\n\n## Wydarzenia';
  const translated = '## Membership\n\n### How to join?\n\n## Events';
  expect(translatedDocHeading(source, translated, 'jak-dolaczyc')).toMatchObject({
    id: 'how-to-join',
    text: 'How to join?'
  });
  expect(translatedDocHeading(source, translated, 'how-to-join')).toMatchObject({
    id: 'how-to-join'
  });
  expect(translatedDocHeading(source, `${translated}\n\n## Extra`, 'wydarzenia')).toBeUndefined();
  expect(translatedDocHeading(source, translated, 'missing')).toBeUndefined();
});

test('translations keep meaningful fields and count toward contributions', () => {
  // Stored JSON can carry keys outside the type, such as the former `pl` translations.
  const stored = { en: { title: '  Day plan ', markdown: '  ' }, pl: { title: 'x' } };
  expect(cleanDocTranslations(stored as DocTranslations)).toEqual({ en: { title: 'Day plan' } });
  expect(
    docLineChanges(
      { markdown: 'a', translations: {} },
      { markdown: 'a\nb', translations: { en: { markdown: 'x\ny' } } }
    )
  ).toEqual({ additions: 3, deletions: 0 });
});

test('a translation is outdated once the Polish page changes after it', () => {
  const en = (markdown: string) => ({ en: { markdown } });
  expect(
    outdatedTranslations([
      { version: 1, title: 'A', markdown: 'jeden', translations: {} },
      { version: 2, title: 'A', markdown: 'jeden', translations: en('one') }
    ])
  ).toEqual([]);
  expect(
    outdatedTranslations([
      { version: 1, title: 'A', markdown: 'jeden', translations: en('one') },
      { version: 2, title: 'A', markdown: 'jeden dwa', translations: en('one') }
    ])
  ).toEqual(['en']);
});
