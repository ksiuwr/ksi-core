import { Lexer, Tokenizer, defaults } from 'marked';

export const minimumImageWidth = 32;
export const maximumImageWidth = 2000;
export function clampImageWidth(width: number) {
  return Math.round(Math.min(maximumImageWidth, Math.max(minimumImageWidth, width)));
}

// Tokenize only the image at the start of source instead of the whole remainder.
function imageAt(source: string) {
  const tokenizer = new Tokenizer();
  tokenizer.lexer = new Lexer({ ...defaults, tokenizer });
  return tokenizer.link(source);
}

// Ignore code: examples containing image syntax must remain literal examples.
export function markdownImages(source: string) {
  const code = [
    ...source.matchAll(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\2[^\n]*(?=\n|$)|$)|(`+)[^`]*?\3/g)
  ].map((match) => [match.index!, match.index! + match[0].length] as const);
  const images: {
    start: number;
    end: number;
    raw: string;
    href: string;
    text: string;
    title: string | null;
    width?: number;
  }[] = [];
  // Without a ')' ahead no image can match, so the remaining candidates are skipped.
  const lastParen = source.lastIndexOf(')');
  let range = 0;
  for (const match of source.matchAll(/!\[/g)) {
    if (match.index! > lastParen) break;
    while (range < code.length && code[range]![1] <= match.index!) range++;
    if (range < code.length && code[range]![0] <= match.index!) continue;
    const remainder = source.slice(match.index!);
    const token = imageAt(remainder);
    if (token?.type !== 'image') continue;
    const raw = token.raw;
    const flag = remainder.slice(raw.length).match(/^\{width=(\d+)\}/);
    const width = flag ? Number(flag[1]) : undefined;
    images.push({
      start: match.index!,
      end: match.index! + raw.length + (flag?.[0].length ?? 0),
      raw,
      href: token.href,
      text: token.text,
      title: token.title ?? null,
      width: width !== undefined ? clampImageWidth(width) : undefined
    });
  }
  return images;
}

export function resizeMarkdownImage(source: string, index: number, width: number) {
  const image = markdownImages(source)[index];
  if (!image || !Number.isFinite(width)) return source;
  return `${source.slice(0, image.start)}${image.raw}{width=${clampImageWidth(width)}}${source.slice(image.end)}`;
}

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function prepareMarkdownImages(source: string, resolveUrl = (href: string) => href) {
  const parts: string[] = [];
  let cursor = 0;
  markdownImages(source).forEach((image, index) => {
    // An image nested in another image's alt text is part of that image.
    if (image.start < cursor) return;
    const tag = `<span class="markdown-image-frame"><img src="${escapeAttribute(resolveUrl(image.href))}" alt="${escapeAttribute(image.text)}"${image.title ? ` title="${escapeAttribute(image.title)}"` : ''}${image.width ? ` width="${image.width}"` : ''} data-ksi-image="${index}"></span>`;
    parts.push(source.slice(cursor, image.start), tag);
    cursor = image.end;
  });
  parts.push(source.slice(cursor));
  return parts.join('');
}
