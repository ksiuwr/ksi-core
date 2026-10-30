import { Lexer, type Token, type Tokens } from 'marked';
import { prepareMarkdownImages } from './markdown-images.js';
import { contentLocales, type ContentLocale, type ContentTranslations } from './content-locales.js';

/** Workspace key used in cross-workspace links such as `[association/statute]`. */
export const associationDocsKey = 'association';
export const docSlugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$';
// Paths below a workspace's docs that cannot be page slugs.
export const reservedDocSlugs = ['new', 'suggestions', 'contributors'];

export type DocLinkTarget = {
  raw: string;
  workspace: string | null;
  name: string;
  heading: string | null;
};

/** Splits `[workspace/name#heading]` without deciding whether the prefix is a real workspace. */
export function parseDocLinkTarget(raw: string): DocLinkTarget | null {
  const value = raw.trim();
  if (!value || value.length > 200) return null;
  const hash = value.lastIndexOf('#');
  const heading = hash > 0 ? value.slice(hash + 1).trim() : null;
  const path = hash > 0 ? value.slice(0, hash).trim() : value;
  if (!path || (heading !== null && !/^[a-z0-9-]+$/.test(heading))) return null;
  const slash = path.indexOf('/');
  const prefix = slash > 0 ? path.slice(0, slash) : null;
  return prefix && new RegExp(docSlugPattern).test(prefix)
    ? { raw, workspace: prefix, name: path.slice(slash + 1).trim(), heading }
    : { raw, workspace: null, name: path, heading };
}

// Brackets that start a link, image, reference definition or task marker are never page links.
const docLinkSource = /(?<![!\\\]])\[([^[\]\n]{1,200})\](?![([:])/g;
export const docLinkToken = /^\[([^[\]\n]{1,200})\](?![([:])/;

/** Bracketed names that may be page links; the renderer decides which ones actually are. */
export function docLinkCandidates(source: string): DocLinkTarget[] {
  const seen = new Set<string>();
  const targets: DocLinkTarget[] = [];
  for (const match of source.matchAll(docLinkSource)) {
    const target = parseDocLinkTarget(match[1]!);
    if (!target || seen.has(target.raw)) continue;
    seen.add(target.raw);
    targets.push(target);
  }
  return targets;
}

/** Normalizes page titles so `[Bus packing]` and `[bus packing]` find the same page. */
export function docNameKey(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl');
}

export function headingSlug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '') || 'section'
  );
}

/** Heading text without Markdown syntax, as readers see it in the outline. */
export function headingText(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^[\]]*)\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Repeated headings get GitHub-style numeric suffixes, so both outline and renderer agree. */
export function headingSlugger() {
  const used = new Set<string>();
  return (text: string) => {
    const base = headingSlug(text);
    let slug = base;
    for (let count = 1; used.has(slug); count++) slug = `${base}-${count}`;
    used.add(slug);
    return slug;
  };
}

export type DocHeading = { level: number; text: string; id: string };

export function markdownHeadings(source: string): DocHeading[] {
  const slug = headingSlugger();
  const headings: DocHeading[] = [];
  const visit = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === 'heading') {
        const heading = token as Tokens.Heading;
        const text = headingText(heading.text);
        headings.push({ level: heading.depth, text, id: slug(text) });
      } else if (token.type === 'blockquote') visit((token as Tokens.Blockquote).tokens);
      else if (token.type === 'list')
        for (const item of (token as Tokens.List).items) visit(item.tokens);
    }
  };
  // The renderer sees images as HTML, so headings are read from the same prepared source.
  visit(Lexer.lex(prepareMarkdownImages(source), { gfm: true }));
  return headings;
}

/** Resolves a section anchor in translated text, keeping English references useful. */
export function translatedDocHeading(source: string, translated: string, id: string) {
  const headings = markdownHeadings(translated);
  const direct = headings.find((heading) => heading.id === id);
  if (direct || source === translated) return direct;
  const original = markdownHeadings(source);
  // Only align equal outlines: an extra section in a translation must not redirect a link
  // to a different section simply because its position moved.
  if (
    original.length !== headings.length ||
    original.some((heading, index) => heading.level !== headings[index]?.level)
  )
    return undefined;
  const index = original.findIndex((heading) => heading.id === id);
  return index < 0 ? undefined : headings[index];
}

/** The opening paragraph as plain text, used for page cards. */
export function markdownExcerpt(source: string, limit = 180) {
  const paragraph = Lexer.lex(source, { gfm: true }).find((token) => token.type === 'paragraph');
  const text = paragraph ? headingText((paragraph as Tokens.Paragraph).text) : '';
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** Languages a page can be translated into; English is the page itself. */
export const docTranslationLocales = contentLocales.filter(
  (locale): locale is Exclude<ContentLocale, 'en'> => locale !== 'en'
);
export type DocTranslation = { title?: string; markdown?: string };
export type DocTranslations = Partial<Record<Exclude<ContentLocale, 'en'>, DocTranslation>>;

/** Keeps translated titles and texts that say something, in a stable shape for comparisons. */
export function cleanDocTranslations(value: ContentTranslations | DocTranslations | undefined) {
  const result: DocTranslations = {};
  for (const locale of docTranslationLocales) {
    const fields = (value as DocTranslations | undefined)?.[locale];
    const title = typeof fields?.title === 'string' ? fields.title.trim() : '';
    const markdown =
      typeof fields?.markdown === 'string' && fields.markdown.trim() ? fields.markdown : '';
    if (title || markdown)
      result[locale] = { ...(title ? { title } : {}), ...(markdown ? { markdown } : {}) };
  }
  return result;
}

type DocText = { markdown: string; translations?: ContentTranslations | DocTranslations };
/** Changed lines across the page and its translations, so translating counts as contributing. */
export function docLineChanges(before: DocText | null, after: DocText) {
  const total = lineChanges(before?.markdown ?? '', after.markdown);
  const previous = cleanDocTranslations(before?.translations);
  const next = cleanDocTranslations(after.translations);
  for (const locale of docTranslationLocales) {
    const change = lineChanges(previous[locale]?.markdown ?? '', next[locale]?.markdown ?? '');
    total.additions += change.additions;
    total.deletions += change.deletions;
  }
  return total;
}

/**
 * A translation is outdated when the English page changed in a later version than the
 * translation did. Revisions are given oldest first.
 */
export function outdatedTranslations(
  revisions: { version: number; title: string; markdown: string; translations: unknown }[]
) {
  let sourceChanged = 0;
  const translated: Partial<Record<string, number>> = {};
  revisions.forEach((revision, index) => {
    const previous = revisions[index - 1];
    if (!previous || previous.title !== revision.title || previous.markdown !== revision.markdown)
      sourceChanged = revision.version;
    const before = cleanDocTranslations(previous?.translations as DocTranslations);
    const after = cleanDocTranslations(revision.translations as DocTranslations);
    for (const locale of docTranslationLocales)
      if (JSON.stringify(before[locale]) !== JSON.stringify(after[locale]))
        translated[locale] = revision.version;
  });
  const latest = cleanDocTranslations(revisions.at(-1)?.translations as DocTranslations);
  return docTranslationLocales.filter(
    (locale) => latest[locale] && (translated[locale] ?? 0) < sourceChanged
  );
}

export type DiffOperation<T> = { type: 'equal' | 'delete' | 'insert'; value: T };

/** Longest-common-subsequence diff, trimming shared ends first to keep edits of long pages cheap. */
export function diffSequences<T>(before: T[], after: T[]): DiffOperation<T>[] {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix])
    prefix++;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  )
    suffix++;
  const left = before.slice(prefix, before.length - suffix);
  const right = after.slice(prefix, after.length - suffix);
  const operations: DiffOperation<T>[] = before
    .slice(0, prefix)
    .map((value) => ({ type: 'equal', value }));
  const width = right.length + 1;
  // Very large rewrites are shown as replacements instead of allocating a huge table.
  if (left.length * right.length > 4_000_000) {
    operations.push(...left.map((value) => ({ type: 'delete' as const, value })));
    operations.push(...right.map((value) => ({ type: 'insert' as const, value })));
  } else {
    const lengths = new Uint32Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--)
      for (let j = right.length - 1; j >= 0; j--)
        lengths[i * width + j] =
          left[i] === right[j]
            ? lengths[(i + 1) * width + j + 1]! + 1
            : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        operations.push({ type: 'equal', value: left[i]! });
        i++;
        j++;
      } else if (
        j < right.length &&
        (i === left.length || lengths[i * width + j + 1]! >= lengths[(i + 1) * width + j]!)
      ) {
        operations.push({ type: 'insert', value: right[j]! });
        j++;
      } else {
        operations.push({ type: 'delete', value: left[i]! });
        i++;
      }
    }
  }
  operations.push(
    ...before.slice(before.length - suffix).map((value) => ({ type: 'equal' as const, value }))
  );
  return operations;
}

/** Changed lines between two page versions, used to measure each member's contribution. */
export function lineChanges(before: string, after: string) {
  const split = (value: string) => (value ? value.replace(/\r\n/g, '\n').split('\n') : []);
  let additions = 0;
  let deletions = 0;
  for (const operation of diffSequences(split(before), split(after))) {
    if (operation.type === 'insert') additions++;
    else if (operation.type === 'delete') deletions++;
  }
  return { additions, deletions };
}

/** Top-level Markdown blocks, so rendered previews can be compared block by block. */
export function markdownBlockSources(source: string) {
  return Lexer.lex(source.replace(/\r\n/g, '\n'), { gfm: true })
    .filter((token) => token.type !== 'space' && token.type !== 'def')
    .map((token) => token.raw.replace(/\n+$/, ''));
}

export type BlockDiffRow =
  | { kind: 'same'; before: string; after: string }
  | { kind: 'changed'; before: string; after: string }
  | { kind: 'removed'; before: string; after: null }
  | { kind: 'added'; before: null; after: string };

/** Aligns blocks so a removed block next to an added one reads as one changed block. */
export function markdownBlockDiff(before: string, after: string): BlockDiffRow[] {
  const rows: BlockDiffRow[] = [];
  let removed: string[] = [];
  let added: string[] = [];
  const flush = () => {
    const paired = Math.min(removed.length, added.length);
    for (let index = 0; index < paired; index++)
      rows.push({ kind: 'changed', before: removed[index]!, after: added[index]! });
    for (const block of removed.slice(paired))
      rows.push({ kind: 'removed', before: block, after: null });
    for (const block of added.slice(paired))
      rows.push({ kind: 'added', before: null, after: block });
    removed = [];
    added = [];
  };
  for (const operation of diffSequences(
    markdownBlockSources(before),
    markdownBlockSources(after)
  )) {
    if (operation.type === 'delete') removed.push(operation.value);
    else if (operation.type === 'insert') added.push(operation.value);
    else {
      flush();
      rows.push({ kind: 'same', before: operation.value, after: operation.value });
    }
  }
  flush();
  return rows;
}

export type WordSegment = { text: string; changed: boolean };

/** Word-level highlights for one changed source block. */
export function wordDiff(before: string, after: string) {
  const split = (value: string) => value.split(/(\s+)/).filter(Boolean);
  const left: WordSegment[] = [];
  const right: WordSegment[] = [];
  for (const operation of diffSequences(split(before), split(after))) {
    const target = operation.type === 'insert' ? right : left;
    const changed = operation.type !== 'equal';
    for (const side of operation.type === 'equal' ? [left, right] : [target]) {
      const last = side.at(-1);
      if (last && last.changed === changed) last.text += operation.value;
      else side.push({ text: operation.value, changed });
    }
  }
  return { before: left, after: right };
}

export function docsPath(projectSlug: string | null, ...segments: string[]) {
  const base = projectSlug
    ? `/projects/${encodeURIComponent(projectSlug)}/docs`
    : '/association/docs';
  return [base, ...segments.map(encodeURIComponent)].join('/');
}
