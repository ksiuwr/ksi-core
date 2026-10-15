import { prepareMarkdownImages, clampImageWidth } from './markdown-images';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
export type MarkdownBlock =
  | { type: 'html'; html: string }
  | { type: 'gallery'; ids: string[]; preview: number };
export function renderMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  source = prepareMarkdownImages(source);
  const gallery = /:::gallery(?:\s+preview=(\d+))?\s*\n([\s\S]*?)\n:::/g;
  const html = (value: string) =>
    sanitizeHtml(
      marked.parse(value.replace(/file:([A-Za-z0-9_-]{8,64})/g, '/media/$1'), {
        async: false
      }) as string,
      {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
        allowedAttributes: {
          a: ['href', 'title', 'rel'],
          img: ['src', 'alt', 'title', 'width', 'data-ksi-image'],
          code: ['class'],
          span: ['class']
        },
        allowedClasses: { span: ['markdown-image-frame'], code: ['language-*'] },
        allowedSchemes: ['https', 'http', 'mailto'],
        allowedSchemesByTag: { img: ['https', 'http'] },
        allowProtocolRelative: false,
        transformTags: {
          a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
          img: (tagName, attribs) => {
            if (attribs.width && /^\d+$/.test(attribs.width))
              attribs.width = String(clampImageWidth(Number(attribs.width)));
            else delete attribs.width;
            if (!/^\d+$/.test(attribs['data-ksi-image'] ?? '')) delete attribs['data-ksi-image'];
            return { tagName, attribs };
          }
        }
      }
    );
  let start = 0;
  for (const match of source.matchAll(gallery)) {
    blocks.push({ type: 'html', html: html(source.slice(start, match.index)) });
    const ids = [
      ...new Set([...match[2]!.matchAll(/file:([A-Za-z0-9_-]{8,64})/g)].map((m) => m[1]!))
    ];
    blocks.push({
      type: 'gallery',
      ids,
      preview: Math.min(ids.length, Math.max(1, Math.min(30, Number(match[1] ?? 3))))
    });
    start = match.index! + match[0].length;
  }
  blocks.push({ type: 'html', html: html(source.slice(start)) });
  return blocks;
}
