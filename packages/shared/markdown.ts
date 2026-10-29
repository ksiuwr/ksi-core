import sanitizeHtml from 'sanitize-html';
import { createMarkdownRenderer } from './markdown-core.js';
import { finalizeMarkdownAttributes, markdownPolicy } from './markdown-policy.js';

// Server entry (Bun, SvelteKit SSR). Browser bundles resolve `shared/markdown` to
// markdown.browser.ts through the `browser` export condition instead, so
// sanitize-html, htmlparser2 and postcss never ship to clients.
export type { MarkdownBlock, MarkdownRenderOptions, MarkdownSanitizer } from './markdown-core.js';
export { mediaBasePath, resolveMarkdownUrl } from './markdown-core.js';

const finalize: sanitizeHtml.Transformer = (tagName, attribs) => ({
  tagName,
  attribs: finalizeMarkdownAttributes(tagName, attribs)
});
const options: sanitizeHtml.IOptions = {
  allowedTags: markdownPolicy.tags,
  allowedAttributes: markdownPolicy.attributes,
  allowedClasses: markdownPolicy.classes,
  allowedSchemes: markdownPolicy.schemes,
  allowedSchemesByTag: markdownPolicy.schemesByTag,
  allowProtocolRelative: false,
  nonTextTags: markdownPolicy.discardContent,
  transformTags: { a: finalize, img: finalize }
};

export const sanitizeMarkdownHtml = (html: string) => sanitizeHtml(html, options);
export const renderMarkdown = createMarkdownRenderer(sanitizeMarkdownHtml);
