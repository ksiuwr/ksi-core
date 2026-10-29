/// <reference lib="dom" />
import DOMPurify, { type Config, type WindowLike } from 'dompurify';
import { createMarkdownRenderer } from './markdown-core.js';
import {
  allowedMarkdownClasses,
  finalizeMarkdownAttributes,
  finalizedMarkdownTags,
  isAllowedMarkdownUrl,
  markdownAttributeNames,
  markdownPolicy
} from './markdown-policy.js';

// Browser entry, selected by the `browser` export condition of `shared/markdown`.
// DOMPurify parses with the browser's own HTML parser, so what it approves is what
// the page renders; it is a fraction of sanitize-html's size (no postcss/htmlparser2).
export type {
  MarkdownBlock,
  MarkdownRenderOptions,
  MarkdownSanitizer,
  ResolvedDocLink
} from './markdown-core.js';
export { mediaBasePath, resolveMarkdownUrl } from './markdown-core.js';

const config = {
  ALLOWED_TAGS: markdownPolicy.tags,
  ALLOWED_ATTR: markdownAttributeNames,
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  FORBID_CONTENTS: markdownPolicy.discardContent,
  RETURN_TRUSTED_TYPE: false
} satisfies Config;

/** A DOMPurify sanitizer that enforces the shared Markdown policy for one window. */
export function createDomPurifySanitizer(window: WindowLike) {
  const purify = DOMPurify(window);
  // Without a usable DOM DOMPurify returns its input unchanged; fail closed instead.
  if (!purify.isSupported) throw new Error('DOMPurify is not supported in this environment');
  purify.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = node.nodeName.toLowerCase();
    if (!markdownPolicy.attributes[tag]?.includes(data.attrName)) {
      data.keepAttr = false;
    } else if (data.attrName === 'class') {
      data.attrValue = allowedMarkdownClasses(tag, data.attrValue);
      data.keepAttr = data.attrValue !== '';
    } else if (data.attrName === 'href' || data.attrName === 'src') {
      data.keepAttr = isAllowedMarkdownUrl(tag, data.attrValue);
    }
  });
  purify.addHook('afterSanitizeAttributes', (node) => {
    const tag = node.nodeName.toLowerCase();
    if (!finalizedMarkdownTags.includes(tag)) return;
    const element = node as Element;
    const current = Object.fromEntries(
      Array.from(element.attributes, (attribute) => [attribute.name, attribute.value])
    );
    const next = finalizeMarkdownAttributes(tag, current);
    const kept = Object.keys(current).filter((name) => name in next);
    // Rewritten elements are rebuilt in the policy's attribute order, as on the server.
    const reordered = kept.some((name, index) => Object.keys(next)[index] !== name);
    for (const name of Object.keys(current))
      if (reordered || !(name in next)) element.removeAttribute(name);
    for (const [name, value] of Object.entries(next))
      if (reordered || current[name] !== value) element.setAttribute(name, value);
  });
  return (html: string) => purify.sanitize(html, config);
}

let sanitizer: ((html: string) => string) | undefined;
export function sanitizeMarkdownHtml(html: string) {
  sanitizer ??= createDomPurifySanitizer(window);
  return sanitizer(html);
}
export const renderMarkdown = createMarkdownRenderer(sanitizeMarkdownHtml);
