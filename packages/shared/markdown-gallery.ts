import { markdownImages } from './markdown-images';

export function insertMarkdownGallery(source: string, selected: string[], preview = 3) {
  const ids = [...new Set(selected.filter((id) => /^[A-Za-z0-9_-]{8,64}$/.test(id)))];
  if (!ids.length) return source;
  const chosen = new Set(ids.map((id) => `file:${id}`));
  for (const image of markdownImages(source).reverse()) {
    if (chosen.has(image.href)) source = source.slice(0, image.start) + source.slice(image.end);
  }
  return `${source.trimEnd()}\n\n:::gallery preview=${Math.max(1, Math.min(30, Math.floor(preview) || 3))}\n${ids.map((id) => `file:${id}`).join('\n')}\n:::\n`;
}
