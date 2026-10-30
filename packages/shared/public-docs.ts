import { associationDocsKey } from './docs.js';

export type PublicDocSummary = {
  slug: string;
  title: string;
  folder: string;
  folderTrail: { id: string; name: string }[];
  excerpt: string;
  updatedAt: string;
  projectSlug: string | null;
  projectName: string | null;
};
export type PublicDocFolder = {
  id: string;
  name: string;
  folders: PublicDocFolder[];
  pages: PublicDocSummary[];
};
export type PublicDocWorkspace = {
  slug: string;
  name: string;
  folders: PublicDocFolder[];
  pages: PublicDocSummary[];
};

/** Navigation is derived exclusively from the public page index, including only its ancestors. */
export function publicDocWorkspaces(
  pages: PublicDocSummary[],
  locale?: string
): PublicDocWorkspace[] {
  const workspaces = new Map<string, PublicDocWorkspace>();
  for (const page of pages) {
    const slug = page.projectSlug ?? associationDocsKey;
    let workspace = workspaces.get(slug);
    if (!workspace) {
      workspace = { slug, name: page.projectName ?? 'KSI', folders: [], pages: [] };
      workspaces.set(slug, workspace);
    }
    let node: Pick<PublicDocFolder, 'folders' | 'pages'> = workspace;
    for (const ancestor of page.folderTrail) {
      let folder = node.folders.find((folder) => folder.id === ancestor.id);
      if (!folder) {
        folder = { ...ancestor, folders: [], pages: [] };
        node.folders.push(folder);
      }
      node = folder;
    }
    node.pages.push(page);
  }
  const sort = (node: Pick<PublicDocFolder, 'folders' | 'pages'>) => {
    node.folders.sort((a, b) => a.name.localeCompare(b.name, locale));
    node.pages.sort((a, b) => a.title.localeCompare(b.title, locale));
    node.folders.forEach(sort);
  };
  for (const workspace of workspaces.values()) sort(workspace);
  return [...workspaces.values()].sort(
    (a, b) =>
      Number(b.slug === associationDocsKey) - Number(a.slug === associationDocsKey) ||
      a.name.localeCompare(b.name, locale)
  );
}

export function publicDocPath(workspace: string, slug: string) {
  return `/docs/${encodeURIComponent(workspace)}/${encodeURIComponent(slug)}`;
}
