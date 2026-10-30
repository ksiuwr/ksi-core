import { associationDocsKey } from './docs.js';

export type PublicDocSummary = {
  slug: string;
  title: string;
  folder: string;
  folderTrail: { id: string; name: string }[];
  excerpt: string;
  updatedAt: string;
  /** False for members-only pages, which the website lists only for active members. */
  public: boolean;
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

/** Navigation is derived exclusively from the reader's page index, including only its ancestors. */
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

/** Reading order: the pages of a level first, then each of its folders. */
export function publicDocPages(
  node: Pick<PublicDocFolder, 'folders' | 'pages'>
): PublicDocSummary[] {
  return [...node.pages, ...node.folders.flatMap(publicDocPages)];
}

/** The pages before and after one page, staying inside its workspace. */
export function publicDocNeighbors(
  pages: PublicDocSummary[],
  workspace: string,
  slug: string,
  locale?: string
) {
  const owner = publicDocWorkspaces(pages, locale).find((item) => item.slug === workspace);
  const order = owner ? publicDocPages(owner) : [];
  const index = order.findIndex((page) => page.slug === slug);
  return index < 0 ? {} : { previous: order[index - 1], next: order[index + 1] };
}

export function publicDocPath(workspace: string, slug: string) {
  return `/docs/${encodeURIComponent(workspace)}/${encodeURIComponent(slug)}`;
}
