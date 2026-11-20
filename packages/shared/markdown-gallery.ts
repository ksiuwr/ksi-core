import { markdownImages } from './markdown-images.js';

export type GalleryState = {
  ids: string[];
  preview: number;
  descriptions?: Record<string, string>;
};
const validId = /^[A-Za-z0-9_-]{8,64}$/;
const idToken = /file:([A-Za-z0-9_-]{8,64})/g;
// Explicit `file:<id> | <description>` syntax is unambiguous for any caption text,
// including captions that contain `file:<id>` tokens.
const explicitDescribedLine = /^\s*file:([A-Za-z0-9_-]{8,64})[ \t]*\|[ \t]*(.*)$/;
// Shorthand `file:<id> <description>` is accepted when the remainder does not start
// with another `file:<id>` token (so legacy multi-id lines like `file:a file:b note`
// keep extracting every id).
const shorthandDescribedLine =
  /^\s*file:([A-Za-z0-9_-]{8,64})[ \t]+(?!file:[A-Za-z0-9_-]{8,64}(?:[\s,]|$))(.+)$/;
const maximumDescriptionLength = 500;

// Descriptions must stay on a single line: a stray newline (or Unicode line separator)
// could close the gallery block early or break regex line matching. Truncate by code
// points so emoji surrogate pairs are never split.
function sanitizeDescription(description: string) {
  const collapsed = description.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
  const points = Array.from(collapsed);
  return (
    points.length > maximumDescriptionLength
      ? points.slice(0, maximumDescriptionLength).join('')
      : collapsed
  ).trim();
}

// Only non-empty descriptions for images actually in the gallery are kept, and the
// field is omitted entirely when none remain so plain galleries stay unchanged.
function galleryState(
  ids: string[],
  preview: number,
  descriptions?: Record<string, string>
): GalleryState {
  const kept: Record<string, string> = {};
  for (const id of ids) {
    const description = sanitizeDescription(descriptions?.[id] ?? '');
    if (description) kept[id] = description;
  }
  return Object.keys(kept).length ? { ids, preview, descriptions: kept } : { ids, preview };
}

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
      const ids: string[] = [];
      const descriptions: Record<string, string> = {};
      const seen = new Set<string>();
      const add = (id: string, description?: string) => {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
        const text = sanitizeDescription(description ?? '');
        if (text && !(id in descriptions)) descriptions[id] = text;
      };
      for (const line of match[2]!.split('\n')) {
        const explicit = line.match(explicitDescribedLine);
        if (explicit) {
          add(explicit[1]!, explicit[2]);
          continue;
        }
        const shorthand = line.match(shorthandDescribedLine);
        if (shorthand) {
          add(shorthand[1]!, shorthand[2]);
          continue;
        }
        // Bare-id lines, legacy multi-id lines, and malformed lines contribute every id.
        for (const token of line.matchAll(idToken)) add(token[1]!);
      }
      return {
        start: match.index!,
        end: match.index! + match[0].length,
        ids,
        preview: Math.min(ids.length, 30, Math.max(0, Number(match[1] ?? 3))),
        ...(Object.keys(descriptions).length ? { descriptions } : {})
      };
    });
}

function galleryMarkdown(ids: string[], preview: number, descriptions?: Record<string, string>) {
  const lines = ids.map((id) => {
    const description = sanitizeDescription(descriptions?.[id] ?? '');
    return description ? `file:${id} | ${description}` : `file:${id}`;
  });
  return `:::gallery preview=${Math.max(0, Math.min(ids.length, 30, Math.floor(preview) || 0))}\n${lines.join('\n')}\n:::`;
}

export function insertMarkdownGallery(
  source: string,
  selected: string[],
  preview = 3,
  descriptions?: Record<string, string>
) {
  const ids = [...new Set(selected.filter((id) => validId.test(id)))];
  if (!ids.length) return source;
  const chosen = new Set(ids.map((id) => `file:${id}`));
  for (const image of markdownImages(source).reverse()) {
    if (chosen.has(image.href)) source = source.slice(0, image.start) + source.slice(image.end);
  }
  return `${source.trimEnd()}\n\n${galleryMarkdown(ids, preview, descriptions)}\n`;
}

export function updateMarkdownGallery(source: string, index: number, state: GalleryState) {
  const block = markdownGalleries(source)[index];
  if (!block) return source;
  const ids = [...new Set(state.ids.filter((id) => validId.test(id)))];
  return (
    source.slice(0, block.start) +
    (ids.length ? galleryMarkdown(ids, state.preview, state.descriptions) : '') +
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
  return galleryState(ids, preview, state.descriptions);
}

export function removeGalleryImage(state: GalleryState, id: string): GalleryState {
  const index = state.ids.indexOf(id);
  if (index < 0) return state;
  return galleryState(
    state.ids.filter((item) => item !== id),
    state.preview - Number(index < state.preview),
    state.descriptions
  );
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
  return galleryState(ids, state.preview, state.descriptions);
}

export function setGalleryImageDescription(
  state: GalleryState,
  id: string,
  description: string
): GalleryState {
  if (!state.ids.includes(id)) return state;
  return galleryState(state.ids, state.preview, { ...state.descriptions, [id]: description });
}
