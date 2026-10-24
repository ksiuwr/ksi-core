import { prepareMarkdownImages, clampImageWidth } from './markdown-images';
import { markdownGalleries } from './markdown-gallery';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
export type MarkdownBlock =
  | { type: 'html'; html: string }
  | { type: 'gallery'; ids: string[]; preview: number };
export function renderMarkdown(source: string, referenceScope = '~association'): MarkdownBlock[] {
  const marked = new Marked({
    extensions: [
      {
        name: 'collaborationReference',
        level: 'inline',
        start(source) {
          return source.indexOf('#');
        },
        tokenizer(source) {
          if (this.lexer.state.inLink) return;
          const match = source.match(
            /^(?:##([1-9]\d{0,8})|#([a-z0-9]+(?:-[a-z0-9]+)*)\/([1-9]\d{0,8})|#([1-9]\d{0,8}))(?![\w/])/
          );
          if (!match) return;
          return {
            type: 'collaborationReference',
            raw: match[0],
            text: match[0],
            scope: match[1] ? '~association' : (match[2] ?? referenceScope),
            number: match[1] ?? match[3] ?? match[4]
          };
        },
        renderer(token) {
          return `<a href="/references/${encodeURIComponent(token.scope)}/${token.number}">${token.text}</a>`;
        }
      }
    ]
  });
  const blocks: MarkdownBlock[] = [];
  source = prepareMarkdownImages(source);
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
  for (const gallery of markdownGalleries(source)) {
    blocks.push({ type: 'html', html: html(source.slice(start, gallery.start)) });
    blocks.push({ type: 'gallery', ids: gallery.ids, preview: gallery.preview });
    start = gallery.end;
  }
  blocks.push({ type: 'html', html: html(source.slice(start)) });
  return blocks;
}
