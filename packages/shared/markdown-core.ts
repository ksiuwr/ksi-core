import { Marked, type TokenizerAndRendererExtension } from 'marked';
import {
  docLinkToken,
  headingSlugger,
  headingText,
  parseDocLinkTarget,
  type DocLinkTarget
} from './docs.js';
import { markdownGalleries } from './markdown-gallery.js';
import { prepareMarkdownImages } from './markdown-images.js';
import { referenceExtension } from './markdown-references.js';

export type MarkdownBlock =
  | { type: 'html'; html: string }
  | { type: 'gallery'; ids: string[]; preview: number };
export type MarkdownRenderOptions = {
  /**
   * Workspace that bare `#12` references belong to (a project slug or `~association`).
   * Without it references stay plain text, as on the public website.
   */
  referenceScope?: string;
  /**
   * Enables `[page]` links between documentation pages and, unless disabled, heading
   * anchors. Unlike references, page names need data, so the caller resolves them.
   */
  docs?: { resolve: (target: DocLinkTarget) => ResolvedDocLink | null; anchors?: boolean };
};
/** Without an href the page exists but this reader may not open it, so only its title shows. */
export type ResolvedDocLink = { href: string | null; label: string; title: string };
/** Turns untrusted HTML into HTML that is safe to insert into the page. */
export type MarkdownSanitizer = (html: string) => string;

/** Uploaded files are written as `file:<id>` and served by each frontend under this path. */
export const mediaBasePath = '/media';
const fileUrl = /^file:([A-Za-z0-9_-]{8,64})$/;
export const resolveMarkdownUrl = (href: string) =>
  href.replace(fileUrl, (_, id: string) => `${mediaBasePath}/${id}`);

/**
 * Builds the isomorphic Markdown renderer. Everything except sanitization is shared,
 * so the server (sanitize-html) and browsers (DOMPurify) produce the same document;
 * references and uploads are resolved from their syntax alone, without data lookups.
 */
export function createMarkdownRenderer(sanitize: MarkdownSanitizer) {
  return function renderMarkdown(
    source: string,
    options: MarkdownRenderOptions = {}
  ): MarkdownBlock[] {
    const docs = options.docs;
    const slug = docs && docs.anchors !== false ? headingSlugger() : null;
    const marked = new Marked({
      extensions: [
        ...(options.referenceScope ? [referenceExtension(options.referenceScope)] : []),
        ...(docs ? [docLinkExtension(docs.resolve)] : [])
      ],
      renderer: {
        heading({ tokens, depth, text }) {
          const html = this.parser.parseInline(tokens);
          if (!slug) return `<h${depth}>${html}</h${depth}>\n`;
          // The prefix keeps page content from colliding with ids used by the app itself.
          const id = slug(headingText(text));
          return `<h${depth} id="section-${id}">${html}<a class="heading-anchor" href="#${id}" aria-label="Copy link to this section"></a></h${depth}>\n`;
        }
      },
      walkTokens(token) {
        // Attachments `[name](file:id)` and reference-style images; inline images are
        // rewritten by prepareMarkdownImages. Code and plain text keep `file:` literally.
        if (token.type === 'link' || token.type === 'image')
          token.href = resolveMarkdownUrl(token.href);
      }
    });
    const html = (value: string) => sanitize(marked.parse(value, { async: false }));
    const prepared = prepareMarkdownImages(source, resolveMarkdownUrl);
    const blocks: MarkdownBlock[] = [];
    let start = 0;
    for (const gallery of markdownGalleries(prepared)) {
      blocks.push({ type: 'html', html: html(prepared.slice(start, gallery.start)) });
      blocks.push({ type: 'gallery', ids: gallery.ids, preview: gallery.preview });
      start = gallery.end;
    }
    blocks.push({ type: 'html', html: html(prepared.slice(start)) });
    return blocks;
  };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function docLinkExtension(
  resolve: (target: DocLinkTarget) => ResolvedDocLink | null
): TokenizerAndRendererExtension {
  return {
    name: 'docLink',
    level: 'inline',
    start(source) {
      for (let index = source.indexOf('['); index !== -1; index = source.indexOf('[', index + 1))
        if (index === 0 || !/[!\\\]]/.test(source[index - 1]!)) return index;
    },
    tokenizer(source) {
      if (this.lexer.state.inLink) return;
      const match = source.match(docLinkToken);
      const target = match && parseDocLinkTarget(match[1]!);
      // Reference-style links keep their Markdown meaning.
      if (!target || this.lexer.tokens.links[match[1]!.toLowerCase().replace(/\s+/g, ' ')]) return;
      return { type: 'docLink', raw: match[0], target };
    },
    renderer(token) {
      const link = resolve(token.target);
      if (!link)
        return `<span class="doc-link-missing" title="${escapeHtml(`No page named “${token.target.raw}”`)}">${escapeHtml(token.raw)}</span>`;
      if (!link.href) return escapeHtml(link.label);
      return `<a class="doc-link" href="${escapeHtml(link.href)}" title="${escapeHtml(link.title)}">${escapeHtml(link.label)}</a>`;
    }
  };
}
