import { markdownImages } from './markdown-images';

/** Use the first content image as the article cover; code examples are excluded. */
export function articleThumbnail(markdown: string): string | null {
  for (const image of markdownImages(markdown)) {
    const file = image.href.match(/^file:([A-Za-z0-9_-]{8,64})$/);
    if (file) return `/media/${file[1]}`;
    if (/^https?:\/\//i.test(image.href)) return image.href;
  }
  const gallery = markdown
    .replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\2[^\n]*(?=\n|$)|$)/g, '')
    .match(/:::gallery[^\n]*\n[\s\S]*?file:([A-Za-z0-9_-]{8,64})[\s\S]*?\n:::/);
  return gallery ? `/media/${gallery[1]}` : null;
}
