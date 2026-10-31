import { eq, isNull, sql } from 'drizzle-orm';
import { status } from 'elysia';
import { docFolders } from '../db';
import type { Executor } from '../lib/audit';
import { docFolderDescendants, docFolderPath, type DocFolder } from 'shared/doc-folders';
import { translationLocales } from 'shared/content-locales';

export const folderWorkspace = (projectId: string | null) =>
  projectId ? eq(docFolders.projectId, projectId) : isNull(docFolders.projectId);

export async function workspaceFolders(executor: Executor, projectId: string | null) {
  return executor.select().from(docFolders).where(folderWorkspace(projectId));
}

/** All tree mutations for a workspace serialize, including creation of duplicate siblings. */
export async function lockFolderTree(executor: Executor, projectId: string | null) {
  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`doc-folders:${projectId ?? 'association'}`}))`
  );
}

export async function folderDestination(
  executor: Executor,
  projectId: string | null,
  body: { folderId?: string | null; folder?: string },
  baseline?: { folderId: string | null; folder: string }
) {
  await lockFolderTree(executor, projectId);
  const folders = await workspaceFolders(executor, projectId);
  let folderId = body.folderId !== undefined ? body.folderId : (baseline?.folderId ?? null);
  // Older clients may select an existing Polish path, but cannot create folders as a side effect.
  if (body.folderId === undefined && body.folder !== undefined) {
    const path = body.folder
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('/');
    folderId = path
      ? (folders.find((folder) => docFolderPath(folders, folder.id) === path)?.id ?? null)
      : null;
    if (path && !folderId) throw status(422, { code: 'FOLDER_NOT_FOUND' });
  }
  if (folderId && !folders.some((folder) => folder.id === folderId))
    throw status(422, { code: 'FOLDER_NOT_FOUND' });
  return { folderId, folder: docFolderPath(folders, folderId) };
}

export function folderDraft(
  folders: DocFolder[],
  body: { name: string; parentId: string | null; translations?: DocFolder['translations'] },
  id?: string
) {
  const name = body.name.trim();
  const translations: DocFolder['translations'] = {};
  for (const locale of translationLocales) {
    const translated = body.translations?.[locale]?.name.trim();
    if (translated) translations[locale] = { name: translated };
  }
  if (
    !name ||
    name.includes('/') ||
    Object.values(translations).some((translation) => translation.name.includes('/'))
  )
    throw status(422, { code: 'FOLDER_NAME_INVALID' });
  if (body.parentId && !folders.some((folder) => folder.id === body.parentId))
    throw status(422, { code: 'FOLDER_NOT_FOUND' });
  if (id && body.parentId && docFolderDescendants(folders, id).has(body.parentId))
    throw status(422, { code: 'FOLDER_CYCLE' });
  if (
    folders.some(
      (folder) =>
        folder.id !== id &&
        folder.parentId === body.parentId &&
        folder.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    )
  )
    throw status(409, { code: 'FOLDER_NAME_TAKEN' });
  return { name, parentId: body.parentId, translations };
}
