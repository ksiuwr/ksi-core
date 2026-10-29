import { clampImageWidth } from './markdown-images.js';
import { isReferenceNumber, isReferenceScope, referenceHref } from './markdown-references.js';

/**
 * The single HTML allowlist for rendered Markdown. The server applies it with
 * sanitize-html and browsers apply it with DOMPurify (see markdown.ts and
 * markdown.browser.ts); both adapters must only translate this policy.
 */
export const markdownPolicy = {
  // sanitize-html's default allowlist plus images.
  tags: [
    'address',
    'article',
    'aside',
    'footer',
    'header',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hgroup',
    'main',
    'nav',
    'section',
    'blockquote',
    'dd',
    'div',
    'dl',
    'dt',
    'figcaption',
    'figure',
    'hr',
    'li',
    'menu',
    'ol',
    'p',
    'pre',
    'ul',
    'a',
    'abbr',
    'b',
    'bdi',
    'bdo',
    'br',
    'cite',
    'code',
    'data',
    'dfn',
    'em',
    'i',
    'kbd',
    'mark',
    'q',
    'rb',
    'rp',
    'rt',
    'rtc',
    'ruby',
    's',
    'samp',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'time',
    'u',
    'var',
    'wbr',
    'caption',
    'col',
    'colgroup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'img'
  ],
  attributes: {
    a: [
      'href',
      'title',
      'rel',
      'class',
      'data-reference-kind',
      'data-reference-scope',
      'data-reference-number',
      'data-sveltekit-preload-data',
      'data-sveltekit-reload'
    ],
    img: ['src', 'alt', 'title', 'width', 'data-ksi-image'],
    code: ['class'],
    span: ['class']
  } as Record<string, string[]>,
  classes: {
    a: ['reference-link'],
    code: ['language-*'],
    span: ['markdown-image-frame']
  } as Record<string, string[]>,
  schemes: ['https', 'http', 'mailto'],
  schemesByTag: { img: ['https', 'http'] } as Record<string, string[]>,
  // Disallowed elements whose text is dropped instead of kept: the union of the
  // sanitize-html and DOMPurify defaults, minus elements allowed above.
  discardContent: [
    'annotation-xml',
    'audio',
    'desc',
    'foreignobject',
    'head',
    'iframe',
    'math',
    'mi',
    'mn',
    'mo',
    'ms',
    'mtext',
    'noembed',
    'noframes',
    'noscript',
    'option',
    'plaintext',
    'script',
    'selectedcontent',
    'style',
    'svg',
    'template',
    'textarea',
    'title',
    'video',
    'xmp'
  ],
  linkRel: 'noopener noreferrer external'
};

export const markdownAttributeNames = [...new Set(Object.values(markdownPolicy.attributes).flat())];

/** Mirrors sanitize-html's URL check: relative URLs and allowlisted schemes, never `//host`. */
export function isAllowedMarkdownUrl(tag: string, url: string) {
  let value = '';
  for (const character of url) if (character.charCodeAt(0) > 32) value += character;
  for (let start = value.indexOf('<!--'); start !== -1; start = value.indexOf('<!--')) {
    const end = value.indexOf('-->', start + 4);
    if (end === -1) break;
    value = value.slice(0, start) + value.slice(end + 3);
  }
  const scheme = value.match(/^([a-zA-Z][a-zA-Z0-9.\-+]*):/)?.[1]?.toLowerCase();
  if (!scheme) return !/^[/\\]{2}/.test(value);
  return (markdownPolicy.schemesByTag[tag] ?? markdownPolicy.schemes).includes(scheme);
}

/** Keeps only allowlisted classes; returns an empty string when none remain. */
export function allowedMarkdownClasses(tag: string, value: string) {
  const allowed = markdownPolicy.classes[tag] ?? [];
  return value
    .split(/\s+/)
    .filter(
      (name) =>
        name &&
        allowed.some((pattern) =>
          pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern
        )
    )
    .join(' ');
}

const referenceAttributes = [
  'data-reference-kind',
  'data-reference-scope',
  'data-reference-number'
];
const referenceKinds = ['local', 'workspace', 'association'];

/**
 * Final attribute rules shared by both sanitizers. Links always get `rel`; anything
 * styled as a reference must point at the reference it describes, so raw HTML cannot
 * dress up an external link as one; image widths are clamped and indexes numeric.
 */
export function finalizeMarkdownAttributes(tag: string, attributes: Record<string, string>) {
  const result = { ...attributes };
  if (tag === 'a') {
    result.rel = markdownPolicy.linkRel;
    const scope = result['data-reference-scope'] ?? '';
    const number = result['data-reference-number'] ?? '';
    const genuine =
      isReferenceScope(scope) &&
      isReferenceNumber(number) &&
      referenceKinds.includes(result['data-reference-kind'] ?? '') &&
      result.href === referenceHref(scope, number);
    if (!genuine) {
      for (const name of referenceAttributes) delete result[name];
      const classes = (result.class ?? '')
        .split(/\s+/)
        .filter((name) => name && name !== 'reference-link')
        .join(' ');
      if (classes) result.class = classes;
      else delete result.class;
    }
  }
  if (tag === 'img') {
    if (/^\d+$/.test(result.width ?? ''))
      result.width = String(clampImageWidth(Number(result.width)));
    else delete result.width;
    if (!/^\d+$/.test(result['data-ksi-image'] ?? '')) delete result['data-ksi-image'];
  }
  return result;
}
