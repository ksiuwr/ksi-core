import { markdownImages } from './markdown-images.js';

export type GalleryState = { ids: string[]; preview: number };
const validId = /^[A-Za-z0-9_-]{8,64}$/;

export function markdownGalleries(source: string) {
  const code = [
    ...source.matchAll(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\2[^\n]*(?=\n|$)|$)/g)
  ].map((match) => [match.index!, match.index! + match[0].length]);
  return [
    ...source.matchAll(
      /^:::gallery(?:\s+preview=(\d+))?[^\S\n]*\n([\s\S]*?)\n:::[^\S\n]*(?=\n|$)/gm
    )
  ]
    .filter((match) => !code.some(([start, end]) => match.index! >= start! && match.index! < end!))
    .map((match) => {
      const ids = [
        ...new Set([...match[2]!.matchAll(/file:([A-Za-z0-9_-]{8,64})/g)].map((id) => id[1]!))
      ];
      return {
        start: match.index!,
        end: match.index! + match[0].length,
        ids,
        preview: Math.min(ids.length, 30, Math.max(0, Number(match[1] ?? 3)))
      };
    });
}

function galleryMarkdown(ids: string[], preview: number) {
  return `:::gallery preview=${Math.max(0, Math.min(ids.length, 30, Math.floor(preview) || 0))}\n${ids.map((id) => `file:${id}`).join('\n')}\n:::`;
}

export function insertMarkdownGallery(source: string, selected: string[], preview = 3) {
  const ids = [...new Set(selected.filter((id) => validId.test(id)))];
  if (!ids.length) return source;
  const chosen = new Set(ids.map((id) => `file:${id}`));
  for (const image of markdownImages(source).reverse()) {
    if (chosen.has(image.href)) source = source.slice(0, image.start) + source.slice(image.end);
  }
  return `${source.trimEnd()}\n\n${galleryMarkdown(ids, preview)}\n`;
}

export function updateMarkdownGallery(source: string, index: number, state: GalleryState) {
  const block = markdownGalleries(source)[index];
  if (!block) return source;
  const ids = [...new Set(state.ids.filter((id) => validId.test(id)))];
  return (
    source.slice(0, block.start) +
    (ids.length ? galleryMarkdown(ids, state.preview) : '') +
    source.slice(block.end)
  );
}

export function toggleGalleryImage(state: GalleryState, id: string): GalleryState {
  const index = state.ids.indexOf(id);
  if (index < 0 || (index >= state.preview && state.preview >= 30)) return state;
  const ids = state.ids.filter((item) => item !== id);
  const selected = index < state.preview;
  const preview = state.preview + (selected ? -1 : 1);
  ids.splice(selected ? preview : state.preview, 0, id);
  return { ids, preview };
}

export function removeGalleryImage(state: GalleryState, id: string): GalleryState {
  const index = state.ids.indexOf(id);
  if (index < 0) return state;
  return {
    ids: state.ids.filter((item) => item !== id),
    preview: state.preview - Number(index < state.preview)
  };
}

// Reordering keeps preview membership; toggling is the explicit selection action.
export function moveGalleryImage(state: GalleryState, id: string, target: number): GalleryState {
  const from = state.ids.indexOf(id);
  if (from < 0 || !Number.isFinite(target)) return state;
  const selected = from < state.preview;
  const to = Math.max(
    selected ? 0 : state.preview,
    Math.min(selected ? state.preview - 1 : state.ids.length - 1, target)
  );
  if (from === to) return state;
  const ids = [...state.ids];
  ids.splice(from, 1);
  ids.splice(to, 0, id);
  return { ids, preview: state.preview };
}
