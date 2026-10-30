import { contentLocale, type ContentLocale } from './content-locales.js';

export type DocFolder = {
  id: string;
  parentId: string | null;
  name: string;
  translations: Partial<Record<Exclude<ContentLocale, 'en'>, { name: string }>>;
};

export function docFolderName(folder: DocFolder, locale?: string | null) {
  const language = contentLocale(locale);
  return (language === 'en' ? '' : folder.translations[language]?.name.trim()) || folder.name;
}

/** Walk IDs, never translated names: renaming a folder cannot change page membership. */
export function docFolderTrail(folders: DocFolder[], id: string | null, locale?: string | null) {
  const trail: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = byId.get(id);
    if (!folder) break;
    trail.unshift({ id: folder.id, name: docFolderName(folder, locale) });
    id = folder.parentId;
  }
  return trail;
}

export function docFolderPath(folders: DocFolder[], id: string | null, locale?: string | null) {
  return docFolderTrail(folders, id, locale)
    .map((folder) => folder.name)
    .join('/');
}

/** Includes the folder itself, so moving a folder below itself or its children is forbidden. */
export function docFolderDescendants(folders: DocFolder[], id: string) {
  const found = new Set([id]);
  let size = 0;
  while (size !== found.size) {
    size = found.size;
    for (const folder of folders)
      if (folder.parentId && found.has(folder.parentId)) found.add(folder.id);
  }
  return found;
}

export function docFolderOptions(folders: DocFolder[], locale?: string | null) {
  const ordered: { id: string; label: string; depth: number }[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    const children = folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => docFolderName(a, locale).localeCompare(docFolderName(b, locale)));
    for (const folder of children) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      ordered.push({ id: folder.id, label: docFolderName(folder, locale), depth });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return ordered;
}
