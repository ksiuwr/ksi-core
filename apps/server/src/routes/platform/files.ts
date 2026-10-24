import { contentChanges, type ContentChange } from 'shared/activity';
import { recordEvent } from '../../lib/audit';
import { optimizeUpload } from '../../lib/image-optimization';
import { articleFileContent } from 'shared/content-locales';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { status, t } from 'elysia';
import {
  db,
  avatarRequests,
  articles,
  articleRevisions,
  articleProposals,
  articleContributors,
  boards,
  comments,
  files,
  fileReferences,
  kanbanItems,
  projectMembers,
  threads,
  users
} from '../../db';
import { createElysia, requirePermission } from '../../lib/createElysia';
import {
  canContribute,
  canLead,
  canReadThread,
  effectivePermissions
} from '../../domain/permissions';
import { hasScopedLeadership } from '../../domain/content-policy';
import {
  privateDownloadUrl,
  publicObjectUrl,
  storageEnvironment,
  uploadPrivate,
  validateUpload,
  objectKey,
  MAX_UPLOAD_BYTES,
  referencedFileIds,
  unpublishObject
} from '../../lib/storage';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = typeof db | Transaction;
type Member = typeof users.$inferSelect;
export const ownerTypes = [
  'profile',
  'avatar-request',
  'article',
  'revision',
  'proposal',
  'comment',
  'item'
] as const;
export type FileOwnerType = (typeof ownerTypes)[number];
export async function fileScope(database: Database, projectId: string | null) {
  const members = projectId
    ? await database.select().from(projectMembers).where(eq(projectMembers.projectId, projectId))
    : [];
  return {
    association: !projectId,
    memberIds: members.map((m) => m.userId),
    leaderIds: members.filter((m) => m.leader).map((m) => m.userId)
  };
}
/** Resolve actual content visibility every time. Stored public flags alone never confer access. */
export async function referenceAccess(
  database: Database,
  ownerType: string,
  ownerId: string,
  user: Member | null
): Promise<{ read: boolean; edit: boolean; public: boolean; projectId: string | null }> {
  const denied = { read: false, edit: false, public: false, projectId: null };
  const active = user?.membershipStatus === 'active';
  if (ownerType === 'avatar-request') {
    const [proposal] = await database
      .select()
      .from(avatarRequests)
      .where(eq(avatarRequests.userId, ownerId));
    if (!proposal || proposal.state !== 'pending') return denied;
    return {
      read:
        !!active &&
        (user!.id === ownerId ||
          (user!.role === 'administrator' &&
            effectivePermissions(user!).has('users.approvals.review-avatar'))),
      edit: !!active && user!.id === ownerId,
      public: false,
      projectId: null
    };
  }
  if (ownerType === 'profile') {
    const [profile] = await database.select().from(users).where(eq(users.id, ownerId));
    if (!profile || profile.membershipStatus !== 'active') return denied;
    return {
      read: true,
      public: true,
      edit:
        !!active &&
        effectivePermissions(user!).has('users.profile.edit-avatar') &&
        (user!.id === ownerId || user!.role === 'administrator'),
      projectId: null
    };
  }
  if (ownerType === 'article' || ownerType === 'revision' || ownerType === 'proposal') {
    let articleId = ownerId,
      proposalAuthor: string | undefined;
    if (ownerType === 'revision') {
      const [revision] = await database
        .select()
        .from(articleRevisions)
        .where(eq(articleRevisions.id, ownerId));
      if (!revision) return denied;
      articleId = revision.articleId;
    }
    if (ownerType === 'proposal') {
      const [proposal] = await database
        .select()
        .from(articleProposals)
        .where(eq(articleProposals.id, ownerId));
      if (!proposal) return denied;
      articleId = proposal.articleId;
      proposalAuthor = proposal.authorId;
    }
    const [article] = await database.select().from(articles).where(eq(articles.id, articleId));
    if (!article) return denied;
    const scope = await fileScope(database, article.projectId);
    const publicContent = ownerType === 'article' && article.state === 'published';
    const [contributor] = user
      ? await database
          .select()
          .from(articleContributors)
          .where(
            and(
              eq(articleContributors.articleId, articleId),
              eq(articleContributors.userId, user.id)
            )
          )
      : [];
    const own =
      !!user && (article.createdBy === user.id || proposalAuthor === user.id || !!contributor);
    const edit =
      !!active &&
      canContribute(user!, scope) &&
      (ownerType === 'proposal'
        ? (proposalAuthor === user!.id &&
            effectivePermissions(user!).has('articles.content.propose')) ||
          hasScopedLeadership(user!, scope, 'articles.content.publish')
        : ownerType === 'article' &&
          (hasScopedLeadership(user!, scope, 'articles.content.publish') ||
            (article.state === 'draft' &&
              own &&
              effectivePermissions(user!).has('articles.content.propose'))));
    return {
      public: publicContent,
      read: publicContent || (!!active && canContribute(user!, scope)),
      edit,
      projectId: article.projectId
    };
  }
  let threadId: string | null = null,
    itemId: string | null = ownerType === 'item' ? ownerId : null,
    authorId: string | undefined;
  if (ownerType === 'comment') {
    const [comment] = await database.select().from(comments).where(eq(comments.id, ownerId));
    // Removed comments are never shown again, so neither are their attachments.
    if (!comment || comment.deletedAt) return denied;
    threadId = comment.threadId;
    itemId = comment.itemId;
    authorId = comment.authorId;
  }
  if (!active) return denied;
  if (threadId) {
    const [thread] = await database.select().from(threads).where(eq(threads.id, threadId));
    if (!thread) return denied;
    const scope = await fileScope(database, thread.projectId);
    const visibility = ['association', 'members', 'leaders'].includes(thread.visibility)
      ? (thread.visibility as 'association' | 'members' | 'leaders')
      : 'leaders';
    const read = canReadThread(user!, scope, visibility, thread.invitedIds);
    return {
      read,
      public: false,
      edit:
        read &&
        !thread.archivedAt &&
        canContribute(user!, scope) &&
        (authorId === user!.id || canLead(user!, scope)),
      projectId: thread.projectId
    };
  }
  if (itemId) {
    const [item] = await database.select().from(kanbanItems).where(eq(kanbanItems.id, itemId));
    if (!item) return denied;
    const [board] = await database.select().from(boards).where(eq(boards.id, item.boardId));
    if (!board) return denied;
    const scope = await fileScope(database, board.projectId);
    return {
      // Deleted tasks are only visible to leaders who may restore them.
      read: !item.deletedAt || hasScopedLeadership(user!, scope, 'collaboration.items.restore'),
      public: false,
      edit:
        !item.deletedAt &&
        canContribute(user!, scope) &&
        (!authorId || authorId === user!.id || canLead(user!, scope)),
      projectId: board.projectId
    };
  }
  return denied;
}
export async function canReadFile(
  database: Database,
  file: typeof files.$inferSelect,
  user: Member | null
) {
  if (
    file.environment !== storageEnvironment() ||
    file.state === 'deleting' ||
    file.state === 'uploading'
  )
    return false;
  const references = await database
    .select()
    .from(fileReferences)
    .where(eq(fileReferences.fileId, file.id));
  if (!references.length && user?.membershipStatus === 'active' && file.uploaderId === user.id)
    return true;
  for (const reference of references) {
    const access = await referenceAccess(database, reference.ownerType, reference.ownerId, user);
    if (
      access.read &&
      (user?.membershipStatus === 'active' ||
        (access.public &&
          (await referenceContainsFile(database, reference.ownerType, reference.ownerId, file.id))))
    )
      return true;
  }
  return false;
}
async function referenceContainsFile(
  database: Database,
  type: string,
  ownerId: string,
  fileId: string
) {
  let content: string | null | undefined;
  if (type === 'avatar-request') {
    const [proposal] = await database
      .select()
      .from(avatarRequests)
      .where(eq(avatarRequests.userId, ownerId));
    content = proposal?.state === 'pending' && proposal.fileId ? `file:${proposal.fileId}` : '';
  }
  if (type === 'article') {
    const [owner] = await database.select().from(articles).where(eq(articles.id, ownerId));
    content = owner ? articleFileContent(owner) : undefined;
  }
  if (type === 'profile') {
    const [owner] = await database
      .select({ content: users.image })
      .from(users)
      .where(eq(users.id, ownerId));
    content = owner?.content;
  }
  if (type === 'revision') {
    const [owner] = await database
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.id, ownerId));
    content = owner ? articleFileContent(owner) : undefined;
  }
  if (type === 'proposal') {
    const [owner] = await database
      .select({ content: articleProposals.markdown })
      .from(articleProposals)
      .where(eq(articleProposals.id, ownerId));
    content = owner?.content;
  }
  if (type === 'comment') {
    const [owner] = await database
      .select({ content: comments.markdown })
      .from(comments)
      .where(eq(comments.id, ownerId));
    content = owner?.content;
  }
  if (type === 'item') {
    const [owner] = await database
      .select({ content: kanbanItems.markdown })
      .from(kanbanItems)
      .where(eq(kanbanItems.id, ownerId));
    content = owner?.content;
  }
  return !!content && referencedFileIds(content).includes(fileId);
}
export async function fileIsPublic(database: Database, fileId: string) {
  const references = await database
    .select()
    .from(fileReferences)
    .where(eq(fileReferences.fileId, fileId));
  for (const ref of references)
    if (
      (await referenceAccess(database, ref.ownerType, ref.ownerId, null)).public &&
      (await referenceContainsFile(database, ref.ownerType, ref.ownerId, fileId))
    )
      return true;
  return false;
}
async function recordFileEvent(
  transaction: Transaction,
  actorId: string,
  action: string,
  fileId: string,
  projectId: string | null,
  changes: ContentChange[]
) {
  await recordEvent(transaction, {
    actorId,
    action,
    targetId: fileId,
    projectId,
    metadata: { changes }
  });
}
export { referencedFileIds } from '../../lib/storage';
/** Call inside the content mutation transaction, after content authorization. All writers lock the same file rows as garbage collection. */
export async function syncFileReferences(
  transaction: Transaction,
  ownerType: FileOwnerType,
  ownerId: string,
  content: string,
  user: Member
) {
  const desired = referencedFileIds(content);
  const existing = await transaction
    .select()
    .from(fileReferences)
    .where(and(eq(fileReferences.ownerType, ownerType), eq(fileReferences.ownerId, ownerId)));
  const affected = [...new Set([...desired, ...existing.map((r) => r.fileId)])].sort();
  if (affected.length)
    await transaction
      .select()
      .from(files)
      .where(inArray(files.id, affected))
      .orderBy(files.id)
      .for('update');
  for (const id of desired) {
    const [file] = await transaction.select().from(files).where(eq(files.id, id));
    if (!file || file.state === 'deleting' || !(await canReadFile(transaction, file, user)))
      throw status(403, { code: 'FILE_REFERENCE_FORBIDDEN' });
    const access = await referenceAccess(transaction, ownerType, ownerId, user);
    await transaction
      .insert(fileReferences)
      .values({ fileId: id, ownerType, ownerId, public: access.public })
      .onConflictDoUpdate({
        target: [fileReferences.fileId, fileReferences.ownerType, fileReferences.ownerId],
        set: { public: access.public }
      });
    await transaction.update(files).set({ orphanedAt: null }).where(eq(files.id, id));
  }
  for (const ref of existing.filter((r) => !desired.includes(r.fileId))) {
    await transaction.delete(fileReferences).where(eq(fileReferences.id, ref.id));
    const [remaining] = await transaction
      .select({ id: fileReferences.id })
      .from(fileReferences)
      .where(eq(fileReferences.fileId, ref.fileId))
      .limit(1);
    if (!remaining)
      await transaction
        .update(files)
        .set({ orphanedAt: new Date() })
        .where(and(eq(files.id, ref.fileId), isNull(files.orphanedAt)));
  }
  for (const id of affected) {
    const [file] = await transaction.select().from(files).where(eq(files.id, id));
    if (file?.state === 'public' && !(await fileIsPublic(transaction, id))) {
      await unpublishObject(file.objectKey);
      await transaction.update(files).set({ state: 'private' }).where(eq(files.id, id));
    }
  }
}
export const filesRoutes = createElysia({ prefix: '/files' })
  .post(
    '/',
    async ({ user, body }) => {
      const member = requirePermission(user, 'files.objects.upload');
      if (body.file.size > MAX_UPLOAD_BYTES) throw status(413, { code: 'FILE_SIZE_INVALID' });
      let bytes = new Uint8Array(await body.file.arrayBuffer());
      let info: ReturnType<typeof validateUpload>;
      try {
        const optimized = await optimizeUpload(bytes, body.file.name, body.file.type);
        bytes = new Uint8Array(optimized.bytes);
        info = optimized.info;
      } catch (error) {
        throw status(400, { code: (error as Error).message });
      }
      const environment = storageEnvironment(),
        key = objectKey(environment, info.hash);
      // Persist staging state before R2 so interrupted uploads can still be garbage-collected.
      const [file] = await db
        .insert(files)
        .values({
          ...info,
          objectKey: key,
          size: bytes.length,
          environment,
          uploaderId: member.id,
          state: 'uploading'
        })
        .returning();
      try {
        await uploadPrivate(key, bytes, info.mime, info.filename);
        await db.transaction(async (tx) => {
          await tx.update(files).set({ state: 'private' }).where(eq(files.id, file!.id));
          await recordFileEvent(
            tx,
            member.id,
            'files.uploaded',
            file!.id,
            null,
            contentChanges({}, file!, ['filename', 'mime', 'size'])
          );
        });
      } catch (e) {
        console.error('Storage Error:', e);
        throw status(503, { code: 'STORAGE_UNAVAILABLE' });
      }
      return {
        id: file!.id,
        filename: info.filename,
        mime: info.mime,
        size: bytes.length,
        url: `/files/${file!.id}/download`
      };
    },
    { body: t.Object({ file: t.File({ maxSize: MAX_UPLOAD_BYTES }) }) }
  )
  .get('/:id/download', async ({ user, params, set }) => {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, params.id), eq(files.environment, storageEnvironment())));
    if (!file || file.state === 'uploading' || !(await canReadFile(db, file, user)))
      throw status(404, { code: 'FILE_NOT_FOUND' });
    set.headers['cache-control'] = 'no-store';
    // Public origin is used only after promotion succeeds AND current content remains public.
    const url =
      file.state === 'public' && (await fileIsPublic(db, file.id))
        ? publicObjectUrl(file.objectKey)
        : await privateDownloadUrl(file.objectKey, file.filename, file.mime);
    return new Response(null, {
      status: 302,
      headers: { location: url, 'cache-control': 'no-store' }
    });
  })
  .post(
    '/:id/references',
    async ({ user, params, body }) => {
      const member = requirePermission(user, 'files.objects.upload');
      return db.transaction(async (tx) => {
        const [file] = await tx.select().from(files).where(eq(files.id, params.id)).for('update');
        if (!file || file.state === 'uploading' || !(await canReadFile(tx, file, member)))
          throw status(404, { code: 'FILE_NOT_FOUND' });
        const access = await referenceAccess(tx, body.ownerType, body.ownerId, member);
        if (
          !access.edit ||
          !(await referenceContainsFile(tx, body.ownerType, body.ownerId, file.id))
        )
          throw status(403, { code: 'FILE_REFERENCE_FORBIDDEN' });
        const [added] = await tx
          .insert(fileReferences)
          .values({
            fileId: file.id,
            ownerType: body.ownerType,
            ownerId: body.ownerId,
            public: access.public
          })
          .onConflictDoNothing()
          .returning();
        await tx.update(files).set({ orphanedAt: null }).where(eq(files.id, file.id));
        if (added)
          await recordFileEvent(
            tx,
            member.id,
            'files.reference-added',
            file.id,
            access.projectId,
            contentChanges(
              {},
              { reference: { ownerType: body.ownerType, ownerId: body.ownerId } },
              ['reference']
            )
          );
        return { ok: true };
      });
    },
    {
      body: t.Object({
        ownerType: t.Union(ownerTypes.map((v) => t.Literal(v))),
        ownerId: t.String({ minLength: 1, maxLength: 64 })
      })
    }
  )
  .delete(
    '/:id/references',
    async ({ user, params, body }) => {
      const member = requirePermission(user, 'files.objects.upload');
      return db.transaction(async (tx) => {
        const [file] = await tx.select().from(files).where(eq(files.id, params.id)).for('update');
        if (!file || file.environment !== storageEnvironment())
          throw status(404, { code: 'FILE_NOT_FOUND' });
        const access = await referenceAccess(tx, body.ownerType, body.ownerId, member);
        if (!access.edit) throw status(403, { code: 'FILE_REFERENCE_FORBIDDEN' });
        if (await referenceContainsFile(tx, body.ownerType, body.ownerId, file.id))
          throw status(409, { code: 'FILE_STILL_REFERENCED' });
        const [removed] = await tx
          .delete(fileReferences)
          .where(
            and(
              eq(fileReferences.fileId, file.id),
              eq(fileReferences.ownerType, body.ownerType),
              eq(fileReferences.ownerId, body.ownerId)
            )
          )
          .returning();
        const [remaining] = await tx
          .select({ id: fileReferences.id })
          .from(fileReferences)
          .where(eq(fileReferences.fileId, file.id))
          .limit(1);
        if (!remaining)
          await tx.update(files).set({ orphanedAt: new Date() }).where(eq(files.id, file.id));
        if (removed)
          await recordFileEvent(
            tx,
            member.id,
            'files.reference-removed',
            file.id,
            access.projectId,
            contentChanges(
              { reference: { ownerType: body.ownerType, ownerId: body.ownerId } },
              {},
              ['reference']
            )
          );
        return { ok: true };
      });
    },
    {
      body: t.Object({
        ownerType: t.Union(ownerTypes.map((v) => t.Literal(v))),
        ownerId: t.String({ minLength: 1, maxLength: 64 })
      })
    }
  );
