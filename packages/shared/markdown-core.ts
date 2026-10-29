import { Marked } from 'marked';
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
};
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
    const marked = new Marked({
      extensions: options.referenceScope ? [referenceExtension(options.referenceScope)] : [],
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
