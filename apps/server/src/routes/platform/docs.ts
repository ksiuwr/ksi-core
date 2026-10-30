import { docFolderPath, docFolderTrail } from 'shared/doc-folders';
import {
  folderDestination,
  folderDraft,
  lockFolderTree,
  workspaceFolders
} from '../../services/doc-folders';
import { contentChanges } from 'shared/activity';
import {
  associationDocsKey,
  cleanDocTranslations,
  docLineChanges,
  docTranslationLocales,
  outdatedTranslations,
  docLinkCandidates,
  docNameKey,
  docSlugPattern,
  docsPath,
  lineChanges,
  markdownBlockDiff,
  markdownExcerpt,
  markdownHeadings,
  parseDocLinkTarget,
  reservedDocSlugs,
  translatedDocHeading,
  wordDiff,
  type DocLinkTarget,
  type DocTranslations
} from 'shared/docs';
import { contentLocale, localizeContent, type ContentLocale } from 'shared/content-locales';
import { renderMarkdown, type ResolvedDocLink } from 'shared/markdown';
import { and, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { status, t } from 'elysia';
import { createElysia } from '../../lib/createElysia';
import { recordEvent, type Executor } from '../../lib/audit';
import { docFolders, docPages, docProposals, docRevisions, projects, users } from '../../db';
import { effectivePermissions, type Principal } from '../../domain/permissions';
import { hasScopedLeadership } from '../../domain/content-policy';
import { active, hasProjectPermission, scopeFor } from './content';

const title = t.String({ minLength: 1, maxLength: 200 });
const markdown = t.String({ maxLength: 500000 });
const slug = t.String({ pattern: docSlugPattern, maxLength: 100 });
const reason = t.String({ maxLength: 1000 });
const folder = t.String({ maxLength: 200 });
const translations = t.Object(
  Object.fromEntries(
    docTranslationLocales.map((locale) => [
      locale,
      t.Optional(
        t.Object(
          { title: t.Optional(t.String({ maxLength: 200 })), markdown: t.Optional(markdown) },
          { additionalProperties: false }
        )
      )
    ])
  ),
  { additionalProperties: false }
);
const locale = t.Optional(t.String({ maxLength: 20 }));
const projectQuery = t.Object({ projectId: t.Optional(t.String()), locale });
const escapeLike = (value: string) => value.replace(/[%_\\]/g, '\\$&');
const translatedTitleMatches = (pattern: string) =>
  docTranslationLocales.map((locale) =>
    ilike(sql<string>`${docPages.translations}->${locale}->>'title'`, pattern)
  );

type DocContent = {
  title: string;
  markdown: string;
  folder: string;
  folderId: string | null;
  translations: DocTranslations;
  public: boolean;
};
/** Normalizes submitted content; translations need the English text they translate. */
function docContent(
  body: {
    title: string;
    markdown: string;
    folder?: string;
    folderId?: string | null;
    translations?: DocTranslations;
    public: boolean;
  },
  baseline?: typeof docPages.$inferSelect
): DocContent {
  const cleaned = cleanDocTranslations(body.translations ?? baseline?.translations);
  if (!body.title.trim()) throw status(422, { code: 'TITLE_REQUIRED' });
  if (!body.markdown.trim() && Object.values(cleaned).some((fields) => fields?.markdown))
    throw status(422, { code: 'ENGLISH_SOURCE_REQUIRED' });
  return {
    title: body.title.trim(),
    markdown: body.markdown,
    folder: body.folder ?? baseline?.folder ?? '',
    folderId: body.folderId !== undefined ? body.folderId : (baseline?.folderId ?? null),
    translations: cleaned,
    public: body.public
  };
}
function sameContent(page: DocContent | typeof docPages.$inferSelect, next: DocContent) {
  return (
    page.title === next.title &&
    page.markdown === next.markdown &&
    page.folderId === next.folderId &&
    page.public === next.public &&
    JSON.stringify(cleanDocTranslations(page.translations)) === JSON.stringify(next.translations)
  );
}
/** The title and text a reader sees in their language, falling back to English per field. */
function readable(
  page: { title: string; markdown: string; translations: unknown },
  requested: string | null | undefined
) {
  const shown = contentLocale(requested);
  const translation =
    shown === 'en' ? undefined : cleanDocTranslations(page.translations as DocTranslations)[shown];
  const localized = localizeContent(
    { title: page.title, markdown: page.markdown, translations: { [shown]: translation ?? {} } },
    shown
  );
  return { ...localized, locale: (translation ? shown : 'en') as ContentLocale };
}

type Person = { id: string; name: string; image: string | null };
type Workspace = { projectId: string | null; slug: string | null; name: string | null };

const workspaceCondition = (projectId: string | null): SQL =>
  projectId ? eq(docPages.projectId, projectId) : isNull(docPages.projectId);

async function people(executor: Executor, ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const rows = unique.length
    ? await executor
        .select({
          id: users.id,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image
        })
        .from(users)
        .where(inArray(users.id, unique))
    : [];
  return new Map<string, Person>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.name,
        image: row.image
      }
    ])
  );
}

export async function docsAccess(executor: Executor, user: Principal, projectId: string | null) {
  const scope = await scopeFor(executor, projectId);
  const canReview =
    hasScopedLeadership(user, scope, 'docs.pages.review') ||
    (!!projectId && (await hasProjectPermission(executor, user, projectId, 'docs.pages.review')));
  return {
    canReview,
    canPublish: hasScopedLeadership(user, scope, 'docs.pages.publish'),
    canPropose: canReview || effectivePermissions(user).has('docs.pages.propose')
  };
}

async function workspace(executor: Executor, projectId: string | null): Promise<Workspace> {
  if (!projectId) return { projectId: null, slug: null, name: null };
  const [project] = await executor
    .select({ slug: projects.slug, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) throw status(404, { code: 'PROJECT_NOT_FOUND' });
  return { projectId, ...project };
}

async function pageById(executor: Executor, id: string, lock = false) {
  const query = executor.select().from(docPages).where(eq(docPages.id, id));
  const [page] = lock ? await query.for('update') : await query;
  if (!page) throw status(404, { code: 'DOC_NOT_FOUND' });
  return page;
}

function validNewSlug(value: string) {
  if (reservedDocSlugs.includes(value)) throw status(422, { code: 'DOC_SLUG_RESERVED' });
}

async function slugTaken(executor: Executor, projectId: string | null, value: string) {
  const [existing] = await executor
    .select({ id: docPages.id })
    .from(docPages)
    .where(and(workspaceCondition(projectId), eq(docPages.slug, value)));
  return !!existing;
}

/**
 * Resolves `[page]`, `[workspace/page]` and `[page#heading]` against the pages the reader may open.
 * Names match slugs first, then titles, inside the current workspace unless a workspace is given.
 */
async function docLinkResolver(
  executor: Executor,
  source: string,
  current: Workspace,
  options: {
    publicOnly?: boolean;
    locale?: string;
    href: (workspace: string | null, page: string) => string;
  }
) {
  const candidates = docLinkCandidates(source);
  if (!candidates.length) return () => null;
  const prefixes = [...new Set(candidates.flatMap((target) => target.workspace ?? []))];
  const prefixed = prefixes.length
    ? await executor
        .select({ id: projects.id, slug: projects.slug, name: projects.name })
        .from(projects)
        .where(inArray(projects.slug, prefixes))
    : [];
  const projectIds = [...new Set([current.projectId, ...prefixed.map((project) => project.id)])];
  const includeAssociation = projectIds.includes(null) || prefixes.includes(associationDocsKey);
  const ids = projectIds.filter((id): id is string => !!id);
  const conditions = [
    ...(ids.length ? [inArray(docPages.projectId, ids)] : []),
    ...(includeAssociation ? [isNull(docPages.projectId)] : [])
  ];
  const withHeadings = candidates.some((target) => target.heading);
  const pages = await executor
    .select({
      projectId: docPages.projectId,
      slug: docPages.slug,
      title: docPages.title,
      translations: docPages.translations,
      public: docPages.public,
      markdown: withHeadings ? docPages.markdown : sql<string>`''`
    })
    .from(docPages)
    .where(or(...conditions));
  const workspaces = new Map<string, { slug: string | null; name: string | null }>(
    [current, ...prefixed.map((project) => ({ ...project, projectId: project.id }))].map((item) => [
      item.projectId ?? '',
      { slug: item.slug, name: item.name }
    ])
  );
  const index = new Map<string, Map<string, (typeof pages)[number]>>();
  for (const page of pages) {
    const key = page.projectId ?? '';
    const entries = index.get(key) ?? new Map();
    entries.set(`title:${docNameKey(page.title)}`, page);
    for (const translation of Object.values(cleanDocTranslations(page.translations)))
      if (translation?.title) entries.set(`title:${docNameKey(translation.title)}`, page);
    entries.set(`slug:${page.slug}`, page);
    index.set(key, entries);
  }
  const find = (projectId: string | null, name: string) => {
    const entries = index.get(projectId ?? '');
    return entries?.get(`slug:${name.trim()}`) ?? entries?.get(`title:${docNameKey(name)}`);
  };
  return (target: DocLinkTarget): ResolvedDocLink | null => {
    const lookups: [string | null, string][] = [];
    if (target.workspace === associationDocsKey) lookups.push([null, target.name]);
    const project = prefixed.find((item) => item.slug === target.workspace);
    if (project) lookups.push([project.id, target.name]);
    lookups.push([
      current.projectId,
      target.workspace ? `${target.workspace}/${target.name}` : target.name
    ]);
    for (const [projectId, name] of lookups) {
      const page = find(projectId, name);
      if (!page) continue;
      const owner = workspaces.get(projectId ?? '');
      const shown = readable(page, options.locale);
      const heading = target.heading
        ? translatedDocHeading(page.markdown, shown.markdown, target.heading)
        : undefined;
      const title = shown.title;
      const path = options.href(owner?.slug ?? null, page.slug);
      const languageQuery =
        options.publicOnly || options.locale !== undefined
          ? `?lang=${contentLocale(options.locale)}`
          : '';
      return {
        href:
          options.publicOnly && !page.public
            ? null
            : `${path}${languageQuery}${target.heading ? `#${heading?.id ?? target.heading}` : ''}`,
        label: heading ? `${title} › ${heading.text}` : title,
        title: `${owner?.name ?? 'Association'} · ${title}`
      };
    }
    return null;
  };
}

const dashboardHref = (workspaceSlug: string | null, page: string) => docsPath(workspaceSlug, page);
const publicHref = (workspaceSlug: string | null, page: string) =>
  `/docs/${encodeURIComponent(workspaceSlug ?? associationDocsKey)}/${encodeURIComponent(page)}`;

/** Renders a documentation page for the dashboard, with task references and page links. */
export async function renderDocMarkdown(
  executor: Executor,
  source: string,
  projectId: string | null,
  anchors = true,
  locale?: string
) {
  const current = await workspace(executor, projectId);
  const resolve = await docLinkResolver(executor, source, current, {
    href: dashboardHref,
    locale
  });
  return renderMarkdown(source, {
    referenceScope: current.slug ?? '~association',
    docs: { resolve, anchors }
  });
}

async function contributorStats(executor: Executor, condition: SQL) {
  const rows = await executor
    .select({
      userId: docRevisions.authorId,
      revisions: sql<number>`count(*)::int`,
      pages: sql<number>`count(distinct ${docRevisions.pageId})::int`,
      additions: sql<number>`coalesce(sum(${docRevisions.additions}), 0)::int`,
      deletions: sql<number>`coalesce(sum(${docRevisions.deletions}), 0)::int`,
      lastContributionAt: sql<Date>`max(${docRevisions.createdAt})`
    })
    .from(docRevisions)
    .innerJoin(docPages, eq(docRevisions.pageId, docPages.id))
    .where(condition)
    .groupBy(docRevisions.authorId);
  const names = await people(
    executor,
    rows.map((row) => row.userId)
  );
  return rows
    .map(({ userId, ...stats }) => ({ user: names.get(userId)!, ...stats }))
    .filter((row) => row.user)
    .sort((a, b) => b.revisions - a.revisions || b.additions - a.additions);
}

async function proposalSummaries(executor: Executor, condition: SQL) {
  const rows = await executor
    .select({
      proposal: docProposals,
      pageTitle: docPages.title,
      pageSlug: docPages.slug,
      pageMarkdown: docPages.markdown,
      pageTranslations: docPages.translations,
      pagePublic: docPages.public,
      pageVersion: docPages.version
    })
    .from(docProposals)
    .leftJoin(docPages, eq(docProposals.pageId, docPages.id))
    .where(condition)
    .orderBy(desc(docProposals.createdAt))
    .limit(100);
  const names = await people(
    executor,
    rows.flatMap((row) => [row.proposal.authorId, row.proposal.reviewerId])
  );
  return rows.map(
    ({ proposal, pageMarkdown, pageTranslations, pagePublic, pageVersion, ...page }) => ({
      id: proposal.id,
      pageId: proposal.pageId,
      pageTitle: page.pageTitle,
      pageSlug: page.pageSlug ?? proposal.slug,
      title: proposal.title,
      reason: proposal.reason,
      state: proposal.state,
      public: proposal.public,
      visibilityChange: proposal.public !== (pagePublic ?? false),
      outdated: !!proposal.pageId && proposal.baseVersion !== pageVersion,
      createdAt: proposal.createdAt,
      reviewedAt: proposal.reviewedAt,
      reviewNote: proposal.reviewNote,
      author: names.get(proposal.authorId) ?? null,
      reviewer: proposal.reviewerId ? (names.get(proposal.reviewerId) ?? null) : null,
      ...docLineChanges(
        pageMarkdown === null
          ? null
          : { markdown: pageMarkdown, translations: pageTranslations ?? {} },
        proposal
      )
    })
  );
}

export default createElysia({ prefix: '/platform' })
  .get(
    '/docs',
    async ({ db, user, query }) => {
      const actor = active(user);
      const projectId = query.projectId ?? null;
      const access = await docsAccess(db, actor, projectId);
      const pages = await db
        .select()
        .from(docPages)
        .where(workspaceCondition(projectId))
        .orderBy(docPages.title);
      const credits = pages.length
        ? await db
            .select({
              pageId: docRevisions.pageId,
              authorId: docRevisions.authorId,
              revisions: sql<number>`count(*)::int`
            })
            .from(docRevisions)
            .where(
              inArray(
                docRevisions.pageId,
                pages.map((page) => page.id)
              )
            )
            .groupBy(docRevisions.pageId, docRevisions.authorId)
        : [];
      const names = await people(
        db,
        credits.map((credit) => credit.authorId)
      );
      const [pending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(docProposals)
        .where(
          and(
            projectId ? eq(docProposals.projectId, projectId) : isNull(docProposals.projectId),
            eq(docProposals.state, 'pending'),
            ...(access.canReview ? [] : [eq(docProposals.authorId, actor.id)])
          )
        );
      const folders = await workspaceFolders(db, projectId);
      return {
        access,
        folders,
        locale: contentLocale(query.locale),
        pendingSuggestions: pending?.count ?? 0,
        pages: pages.map(({ markdown, translations, ...page }) => ({
          ...page,
          folder: docFolderPath(folders, page.folderId, query.locale),
          ...(({ title, markdown: text }) => ({ title, excerpt: markdownExcerpt(text) }))(
            readable({ title: page.title, markdown, translations }, query.locale)
          ),
          contributors: credits
            .filter((credit) => credit.pageId === page.id)
            .sort((a, b) => b.revisions - a.revisions)
            .flatMap((credit) => names.get(credit.authorId) ?? [])
        }))
      };
    },
    { query: projectQuery }
  )
  .post(
    '/docs/folders',
    async ({ db, user, body }) => {
      const actor = active(user);
      const projectId = body.projectId ?? null;
      return db.transaction(async (tx) => {
        if (!(await docsAccess(tx, actor, projectId)).canReview)
          throw status(403, { code: 'FORBIDDEN' });
        await lockFolderTree(tx, projectId);
        const draft = folderDraft(await workspaceFolders(tx, projectId), body);
        const [created] = await tx
          .insert(docFolders)
          .values({ projectId, ...draft })
          .returning();
        await recordEvent(tx, {
          actorId: actor.id,
          projectId,
          action: 'docs.folder.created',
          targetId: created!.id,
          metadata: { name: draft.name, parentId: draft.parentId }
        });
        return created!;
      });
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        parentId: t.Nullable(t.String()),
        name: t.String({ minLength: 1, maxLength: 80 }),
        translations: t.Optional(
          t.Object({ pl: t.Optional(t.Object({ name: t.String({ maxLength: 80 }) })) })
        )
      })
    }
  )
  .put(
    '/docs/folders/:id',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const [original] = await tx.select().from(docFolders).where(eq(docFolders.id, params.id));
        if (!original) throw status(404, { code: 'FOLDER_NOT_FOUND' });
        const projectId = original.projectId;
        if (!(await docsAccess(tx, actor, projectId)).canReview)
          throw status(403, { code: 'FORBIDDEN' });
        await lockFolderTree(tx, projectId);
        const folders = await workspaceFolders(tx, projectId);
        if (!folders.some((folder) => folder.id === original.id))
          throw status(404, { code: 'FOLDER_NOT_FOUND' });
        const draft = folderDraft(folders, body, original.id);
        const [updated] = await tx
          .update(docFolders)
          .set({ ...draft, updatedAt: new Date() })
          .where(eq(docFolders.id, original.id))
          .returning();
        await recordEvent(tx, {
          actorId: actor.id,
          projectId,
          action: 'docs.folder.updated',
          targetId: original.id,
          metadata: {
            changes: contentChanges(original, updated!, ['name', 'parentId', 'translations'])
          }
        });
        return updated!;
      });
    },
    {
      body: t.Object({
        parentId: t.Nullable(t.String()),
        name: t.String({ minLength: 1, maxLength: 80 }),
        translations: t.Optional(
          t.Object({ pl: t.Optional(t.Object({ name: t.String({ maxLength: 80 }) })) })
        )
      })
    }
  )
  .delete('/docs/folders/:id', async ({ db, user, params }) => {
    const actor = active(user);
    return db.transaction(async (tx) => {
      const [folder] = await tx.select().from(docFolders).where(eq(docFolders.id, params.id));
      if (!folder) throw status(404, { code: 'FOLDER_NOT_FOUND' });
      if (!(await docsAccess(tx, actor, folder.projectId)).canReview)
        throw status(403, { code: 'FORBIDDEN' });
      await lockFolderTree(tx, folder.projectId);
      const [child] = await tx
        .select({ id: docFolders.id })
        .from(docFolders)
        .where(eq(docFolders.parentId, folder.id))
        .limit(1);
      const [page] = await tx
        .select({ id: docPages.id })
        .from(docPages)
        .where(eq(docPages.folderId, folder.id))
        .limit(1);
      if (child || page) throw status(409, { code: 'FOLDER_NOT_EMPTY' });
      const [proposal] = await tx
        .select({ id: docProposals.id })
        .from(docProposals)
        .where(and(eq(docProposals.folderId, folder.id), eq(docProposals.state, 'pending')))
        .limit(1);
      if (proposal) throw status(409, { code: 'FOLDER_IN_USE' });
      const [deleted] = await tx.delete(docFolders).where(eq(docFolders.id, folder.id)).returning();
      if (!deleted) throw status(404, { code: 'FOLDER_NOT_FOUND' });
      await recordEvent(tx, {
        actorId: actor.id,
        projectId: folder.projectId,
        action: 'docs.folder.deleted',
        targetId: folder.id,
        metadata: {
          name: deleted.name,
          parentId: deleted.parentId,
          translations: deleted.translations
        }
      });
      return { deleted: true };
    });
  })
  .post(
    '/docs/:id/move',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const page = await pageById(tx, params.id, true);
        if (!(await docsAccess(tx, actor, page.projectId)).canReview)
          throw status(403, { code: 'FORBIDDEN' });
        if (page.version !== body.version) throw status(409, { code: 'REVISION_CONFLICT' });
        const destination = await folderDestination(tx, page.projectId, body);
        if (page.folderId === destination.folderId) throw status(422, { code: 'NO_CHANGES' });
        const [updated] = await tx
          .update(docPages)
          .set({ ...destination, version: page.version + 1, updatedAt: new Date() })
          .where(eq(docPages.id, page.id))
          .returning();
        await tx.insert(docRevisions).values({
          pageId: page.id,
          version: updated!.version,
          ...destination,
          title: page.title,
          markdown: page.markdown,
          translations: page.translations,
          public: page.public,
          authorId: actor.id,
          reason: 'Moved page',
          additions: 0,
          deletions: 0
        });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: page.projectId,
          action: 'docs.updated',
          targetId: page.id,
          metadata: {
            version: updated!.version,
            changes: contentChanges(page, updated!, ['folder', 'folderId'])
          }
        });
        return updated!;
      });
    },
    { body: t.Object({ folderId: t.Nullable(t.String()), version: t.Integer({ minimum: 1 }) }) }
  )
  .get(
    '/docs/search',
    async ({ db, user, query }) => {
      active(user);
      const scope = query.scope ?? '~association';
      const [current] =
        scope === '~association'
          ? [null]
          : await db
              .select({ id: projects.id, slug: projects.slug })
              .from(projects)
              .where(eq(projects.slug, scope));
      if (current === undefined) throw status(404, { code: 'PROJECT_NOT_FOUND' });
      const currentId = current?.id ?? null;
      const reference = (projectSlug: string | null, page: string) =>
        (projectSlug ?? null) === (current?.slug ?? null)
          ? page
          : `${projectSlug ?? associationDocsKey}/${page}`;
      const raw = (query.q ?? '').trim();
      const hash = raw.indexOf('#');
      // After `#`, suggest sections of the page named before it.
      if (hash > 0) {
        const target = parseDocLinkTarget(raw.slice(0, hash));
        if (!target) return [];
        const [project] =
          target.workspace && target.workspace !== associationDocsKey
            ? await db
                .select({ id: projects.id, slug: projects.slug, name: projects.name })
                .from(projects)
                .where(eq(projects.slug, target.workspace))
            : [];
        const projectId =
          target.workspace === associationDocsKey ? null : (project?.id ?? currentId);
        const [page] = await db
          .select({
            slug: docPages.slug,
            title: docPages.title,
            markdown: docPages.markdown,
            translations: docPages.translations
          })
          .from(docPages)
          .where(
            and(
              workspaceCondition(projectId),
              or(
                eq(docPages.slug, target.name),
                ilike(docPages.title, escapeLike(target.name)),
                ...translatedTitleMatches(escapeLike(target.name))
              )
            )
          )
          .orderBy(sql`case when ${docPages.slug} = ${target.name} then 0 else 1 end`)
          .limit(1);
        if (!page) return [];
        const shown = readable(page, query.locale);
        const term = raw.slice(hash + 1).toLowerCase();
        const pageReference = raw.slice(0, hash);
        return markdownHeadings(shown.markdown)
          .filter(
            (heading) => heading.id.includes(term) || heading.text.toLowerCase().includes(term)
          )
          .slice(0, 12)
          .map((heading) => ({
            reference: `${pageReference}#${heading.id}`,
            title: heading.text,
            context: shown.title,
            level: heading.level
          }));
      }
      const prefix = raw.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)\//)?.[1] ?? null;
      const term = prefix ? raw.slice(prefix.length + 1) : raw;
      const like = `%${escapeLike(term)}%`;
      const rows = await db
        .select({
          slug: docPages.slug,
          title: docPages.title,
          translations: docPages.translations,
          projectId: docPages.projectId,
          projectSlug: projects.slug,
          projectName: projects.name
        })
        .from(docPages)
        .leftJoin(projects, eq(docPages.projectId, projects.id))
        .where(
          or(
            ilike(docPages.title, like),
            ilike(docPages.slug, like),
            ...translatedTitleMatches(like)
          )
        )
        .orderBy(docPages.title)
        .limit(200);
      return rows
        .filter(
          (row) =>
            !prefix || (prefix === associationDocsKey ? !row.projectId : row.projectSlug === prefix)
        )
        .sort(
          (a, b) =>
            Number(a.projectId !== currentId) - Number(b.projectId !== currentId) ||
            a.title.localeCompare(b.title)
        )
        .slice(0, 12)
        .map((row) => ({
          reference: reference(row.projectSlug, row.slug),
          title: readable({ ...row, markdown: '' }, query.locale).title,
          context: row.projectName ?? null,
          level: 0
        }));
    },
    {
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 200 })),
        scope: t.Optional(
          t.String({ maxLength: 100, pattern: '^(~association|[a-z0-9]+(?:-[a-z0-9]+)*)$' })
        ),
        locale
      })
    }
  )
  .get(
    '/docs/page',
    async ({ db, user, query }) => {
      const actor = active(user);
      const projectId = query.projectId ?? null;
      const access = await docsAccess(db, actor, projectId);
      const [page] = await db
        .select()
        .from(docPages)
        .where(and(workspaceCondition(projectId), eq(docPages.slug, query.slug)));
      if (!page) throw status(404, { code: 'DOC_NOT_FOUND' });
      const [latest] = await db
        .select({ authorId: docRevisions.authorId })
        .from(docRevisions)
        .where(eq(docRevisions.pageId, page.id))
        .orderBy(desc(docRevisions.version))
        .limit(1);
      const names = await people(db, [page.createdBy, latest?.authorId ?? null]);
      const [pending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(docProposals)
        .where(and(eq(docProposals.pageId, page.id), eq(docProposals.state, 'pending')));
      const history = await db
        .select({
          version: docRevisions.version,
          title: docRevisions.title,
          markdown: docRevisions.markdown,
          translations: docRevisions.translations
        })
        .from(docRevisions)
        .where(eq(docRevisions.pageId, page.id))
        .orderBy(docRevisions.version);
      const shown = readable(page, query.locale);
      const folders = await workspaceFolders(db, projectId);
      return {
        ...page,
        folder: docFolderPath(folders, page.folderId, query.locale),
        access,
        locale: shown.locale,
        locales: ['en', ...Object.keys(cleanDocTranslations(page.translations))] as ContentLocale[],
        outdatedLocales: outdatedTranslations(history),
        displayTitle: shown.title,
        blocks: await renderDocMarkdown(db, shown.markdown, projectId, true, query.locale),
        headings: markdownHeadings(shown.markdown),
        createdByUser: names.get(page.createdBy) ?? null,
        updatedByUser: latest ? (names.get(latest.authorId) ?? null) : null,
        contributors: await contributorStats(db, eq(docRevisions.pageId, page.id)),
        pendingSuggestions: pending?.count ?? 0
      };
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        slug: t.String({ maxLength: 100 }),
        locale
      })
    }
  )
  .post(
    '/docs',
    async ({ db, user, body }) => {
      const actor = active(user);
      const projectId = body.projectId ?? null;
      validNewSlug(body.slug);
      return db.transaction(async (tx) => {
        const access = await docsAccess(tx, actor, projectId);
        if (!access.canReview) throw status(403, { code: 'FORBIDDEN' });
        if (body.public && !access.canPublish) throw status(403, { code: 'PUBLISH_FORBIDDEN' });
        if (await slugTaken(tx, projectId, body.slug))
          throw status(409, { code: 'DOC_SLUG_TAKEN' });
        const content = { ...docContent(body), ...(await folderDestination(tx, projectId, body)) };
        const [page] = await tx
          .insert(docPages)
          .values({ projectId, slug: body.slug, ...content, createdBy: actor.id })
          .returning();
        await tx.insert(docRevisions).values({
          pageId: page!.id,
          version: 1,
          ...content,
          authorId: actor.id,
          reason: body.reason.trim(),
          ...docLineChanges(null, content)
        });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId,
          action: 'docs.created',
          targetId: page!.id,
          metadata: {
            version: 1,
            changes: contentChanges({}, page!, ['title', 'slug', 'folder', 'public'])
          }
        });
        return page!;
      });
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        slug,
        title,
        markdown,
        folder: t.Optional(folder),
        folderId: t.Optional(t.Nullable(t.String())),
        translations: t.Optional(translations),
        public: t.Boolean(),
        reason
      })
    }
  )
  .put(
    '/docs/:id',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const page = await pageById(tx, params.id, true);
        const access = await docsAccess(tx, actor, page.projectId);
        if (!access.canReview) throw status(403, { code: 'FORBIDDEN' });
        if (body.public !== page.public && !access.canPublish)
          throw status(403, { code: 'PUBLISH_FORBIDDEN' });
        if (body.version !== page.version)
          throw status(409, { code: 'REVISION_CONFLICT', currentVersion: page.version });
        const content = {
          ...docContent(body, page),
          ...(await folderDestination(tx, page.projectId, body, page))
        };
        if (sameContent(page, content)) throw status(422, { code: 'NO_CHANGES' });
        const [updated] = await tx
          .update(docPages)
          .set({ ...content, version: page.version + 1, updatedAt: new Date() })
          .where(eq(docPages.id, page.id))
          .returning();
        await tx.insert(docRevisions).values({
          pageId: page.id,
          version: updated!.version,
          ...content,
          authorId: actor.id,
          reason: body.reason.trim(),
          ...docLineChanges(page, content)
        });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: page.projectId,
          action: 'docs.updated',
          targetId: page.id,
          metadata: {
            version: updated!.version,
            reason: body.reason.trim() || undefined,
            changes: contentChanges(page, updated!, [
              'title',
              'markdown',
              'folder',
              'translations',
              'public'
            ])
          }
        });
        return updated!;
      });
    },
    {
      body: t.Object({
        version: t.Integer({ minimum: 1 }),
        title,
        markdown,
        folder: t.Optional(folder),
        folderId: t.Optional(t.Nullable(t.String())),
        translations: t.Optional(translations),
        public: t.Boolean(),
        reason
      })
    }
  )
  .get('/docs/:id/revisions', async ({ db, user, params }) => {
    active(user);
    const page = await pageById(db, params.id);
    const revisions = await db
      .select({
        id: docRevisions.id,
        version: docRevisions.version,
        title: docRevisions.title,
        public: docRevisions.public,
        reason: docRevisions.reason,
        additions: docRevisions.additions,
        deletions: docRevisions.deletions,
        proposalId: docRevisions.proposalId,
        authorId: docRevisions.authorId,
        reviewerId: docRevisions.reviewerId,
        createdAt: docRevisions.createdAt
      })
      .from(docRevisions)
      .where(eq(docRevisions.pageId, page.id))
      .orderBy(desc(docRevisions.version));
    const names = await people(
      db,
      revisions.flatMap((revision) => [revision.authorId, revision.reviewerId])
    );
    return revisions.map(({ authorId, reviewerId, ...revision }) => ({
      ...revision,
      author: names.get(authorId) ?? null,
      reviewer: reviewerId ? (names.get(reviewerId) ?? null) : null
    }));
  })
  .get(
    '/docs/:id/revisions/:version',
    async ({ db, user, params }) => {
      active(user);
      const page = await pageById(db, params.id);
      const revisions = await db
        .select()
        .from(docRevisions)
        .where(
          and(
            eq(docRevisions.pageId, page.id),
            inArray(docRevisions.version, [params.version, params.version - 1])
          )
        );
      const revision = revisions.find((item) => item.version === params.version);
      if (!revision) throw status(404, { code: 'REVISION_NOT_FOUND' });
      const previous = revisions.find((item) => item.version === params.version - 1) ?? null;
      const snapshot = (item: typeof revision) => ({
        version: item.version,
        folder: item.folder,
        title: item.title,
        markdown: item.markdown,
        translations: cleanDocTranslations(item.translations),
        public: item.public
      });
      return { ...snapshot(revision), previous: previous && snapshot(previous) };
    },
    {
      params: t.Object({
        id: t.String(),
        version: t.Numeric({ minimum: 1, maximum: 2147483647, multipleOf: 1 })
      })
    }
  )
  .post(
    '/docs/links',
    async ({ db, user, body }) => {
      active(user);
      const [project] =
        body.scope === '~association'
          ? [null]
          : await db
              .select({ id: projects.id })
              .from(projects)
              .where(eq(projects.slug, body.scope));
      if (project === undefined) throw status(404, { code: 'PROJECT_NOT_FOUND' });
      const current = await workspace(db, project?.id ?? null);
      const source = body.targets.map((target) => `[${target}]`).join(' ');
      const resolve = await docLinkResolver(db, source, current, {
        href: dashboardHref,
        locale: body.locale
      });
      return Object.fromEntries(
        body.targets.map((target) => {
          const parsed = parseDocLinkTarget(target);
          return [target, parsed ? resolve(parsed) : null];
        })
      );
    },
    {
      body: t.Object({
        scope: t.String({ maxLength: 100, pattern: '^(~association|[a-z0-9]+(?:-[a-z0-9]+)*)$' }),
        targets: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 200 }),
        locale
      })
    }
  )
  .post(
    '/docs/diff',
    async ({ db, user, body }) => {
      active(user);
      const projectId = body.projectId ?? null;
      const current = await workspace(db, projectId);
      const resolve = await docLinkResolver(db, `${body.before}\n\n${body.after}`, current, {
        href: dashboardHref,
        locale: body.locale
      });
      const render = (source: string) =>
        renderMarkdown(source, {
          referenceScope: current.slug ?? '~association',
          docs: { resolve, anchors: false }
        });
      return {
        ...lineChanges(body.before, body.after),
        rows: markdownBlockDiff(body.before, body.after).map((row) => ({
          kind: row.kind,
          beforeSource: row.before,
          afterSource: row.after,
          before: row.before === null ? null : render(row.before),
          after: row.kind === 'same' || row.after === null ? null : render(row.after),
          words: row.kind === 'changed' ? wordDiff(row.before, row.after) : null
        }))
      };
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        before: markdown,
        after: markdown,
        locale
      })
    }
  )
  .post(
    '/docs/proposals',
    async ({ db, user, body }) => {
      const actor = active(user);
      if (body.reason.trim().length < 3) throw status(422, { code: 'REASON_REQUIRED' });
      return db.transaction(async (tx) => {
        const page = body.pageId ? await pageById(tx, body.pageId) : null;
        const projectId = page ? page.projectId : (body.projectId ?? null);
        const access = await docsAccess(tx, actor, projectId);
        if (!access.canPropose) throw status(403, { code: 'FORBIDDEN' });
        const content = {
          ...docContent(body, page ?? undefined),
          ...(await folderDestination(tx, projectId, body, page ?? undefined))
        };
        if (page) {
          if (body.baseVersion !== page.version)
            throw status(409, { code: 'REVISION_CONFLICT', currentVersion: page.version });
          if (sameContent(page, content)) throw status(422, { code: 'NO_CHANGES' });
        } else {
          if (!body.slug) throw status(422, { code: 'DOC_SLUG_REQUIRED' });
          validNewSlug(body.slug);
          if (await slugTaken(tx, projectId, body.slug))
            throw status(409, { code: 'DOC_SLUG_TAKEN' });
        }
        const [proposal] = await tx
          .insert(docProposals)
          .values({
            projectId,
            pageId: page?.id ?? null,
            slug: page ? null : body.slug,
            baseVersion: page?.version ?? null,
            ...content,
            reason: body.reason.trim(),
            authorId: actor.id
          })
          .returning();
        await recordEvent(tx, {
          actorId: actor.id,
          projectId,
          action: 'docs.proposal.created',
          targetId: proposal!.id,
          metadata: { pageId: page?.id, reason: proposal!.reason }
        });
        return proposal!;
      });
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        pageId: t.Optional(t.String()),
        slug: t.Optional(slug),
        baseVersion: t.Optional(t.Integer({ minimum: 1 })),
        title,
        markdown,
        folder: t.Optional(folder),
        folderId: t.Optional(t.Nullable(t.String())),
        translations: t.Optional(translations),
        public: t.Boolean(),
        reason
      })
    }
  )
  .get(
    '/docs/proposals',
    async ({ db, user, query }) => {
      const actor = active(user);
      const projectId = query.projectId ?? null;
      await docsAccess(db, actor, projectId);
      return proposalSummaries(
        db,
        and(
          projectId ? eq(docProposals.projectId, projectId) : isNull(docProposals.projectId),
          query.state === 'resolved'
            ? sql`${docProposals.state} <> 'pending'`
            : eq(docProposals.state, 'pending')
        )!
      );
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        state: t.Optional(t.Union([t.Literal('pending'), t.Literal('resolved')]))
      })
    }
  )
  .get('/docs/proposals/:id', async ({ db, user, params }) => {
    const actor = active(user);
    const [proposal] = await db.select().from(docProposals).where(eq(docProposals.id, params.id));
    if (!proposal) throw status(404, { code: 'PROPOSAL_NOT_FOUND' });
    const page = proposal.pageId ? await pageById(db, proposal.pageId) : null;
    const names = await people(db, [proposal.authorId, proposal.reviewerId]);
    // Reviewed suggestions are compared with the version their author started from.
    const [base] =
      page && proposal.baseVersion
        ? await db
            .select({
              title: docRevisions.title,
              markdown: docRevisions.markdown,
              folder: docRevisions.folder,
              translations: docRevisions.translations
            })
            .from(docRevisions)
            .where(
              and(eq(docRevisions.pageId, page.id), eq(docRevisions.version, proposal.baseVersion))
            )
        : [];
    return {
      ...proposal,
      translations: cleanDocTranslations(proposal.translations),
      author: names.get(proposal.authorId) ?? null,
      reviewer: proposal.reviewerId ? (names.get(proposal.reviewerId) ?? null) : null,
      page: page && {
        id: page.id,
        slug: page.slug,
        folder: page.folder,
        title: page.title,
        markdown: page.markdown,
        translations: cleanDocTranslations(page.translations),
        public: page.public,
        version: page.version
      },
      base: base ? { ...base, translations: cleanDocTranslations(base.translations) } : null,
      outdated: !!page && proposal.baseVersion !== page.version,
      access: await docsAccess(db, actor, proposal.projectId),
      isAuthor: proposal.authorId === actor.id
    };
  })
  .post(
    '/docs/proposals/:id/resolve',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const [proposal] = await tx
          .select()
          .from(docProposals)
          .where(eq(docProposals.id, params.id))
          .for('update');
        if (!proposal) throw status(404, { code: 'PROPOSAL_NOT_FOUND' });
        if (proposal.state !== 'pending') throw status(409, { code: 'PROPOSAL_ALREADY_RESOLVED' });
        const access = await docsAccess(tx, actor, proposal.projectId);
        if (!access.canReview) throw status(403, { code: 'FORBIDDEN' });
        const page = proposal.pageId ? await pageById(tx, proposal.pageId, true) : null;
        let pageId = page?.id ?? null;
        if (body.accept) {
          const content = {
            ...docContent({
              ...proposal,
              translations: proposal.translations as DocTranslations
            }),
            ...(await folderDestination(tx, proposal.projectId, { folderId: proposal.folderId }))
          };
          if (proposal.public !== (page?.public ?? false) && !access.canPublish)
            throw status(403, { code: 'PUBLISH_FORBIDDEN' });
          if (page) {
            const [updated] = await tx
              .update(docPages)
              .set({ ...content, version: page.version + 1, updatedAt: new Date() })
              .where(eq(docPages.id, page.id))
              .returning();
            await tx.insert(docRevisions).values({
              pageId: page.id,
              version: updated!.version,
              ...content,
              authorId: proposal.authorId,
              reviewerId: actor.id,
              proposalId: proposal.id,
              reason: proposal.reason,
              ...docLineChanges(page, content)
            });
          } else {
            if (await slugTaken(tx, proposal.projectId, proposal.slug!))
              throw status(409, { code: 'DOC_SLUG_TAKEN' });
            const [created] = await tx
              .insert(docPages)
              .values({
                projectId: proposal.projectId,
                slug: proposal.slug!,
                ...content,
                createdBy: proposal.authorId
              })
              .returning();
            pageId = created!.id;
            await tx.insert(docRevisions).values({
              pageId: created!.id,
              version: 1,
              ...content,
              authorId: proposal.authorId,
              reviewerId: actor.id,
              proposalId: proposal.id,
              reason: proposal.reason,
              ...docLineChanges(null, content)
            });
          }
        }
        const [resolved] = await tx
          .update(docProposals)
          .set({
            pageId,
            state: body.accept ? 'accepted' : 'rejected',
            reviewerId: actor.id,
            reviewNote: body.note?.trim() || null,
            reviewedAt: new Date()
          })
          .where(eq(docProposals.id, proposal.id))
          .returning();
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: proposal.projectId,
          action: body.accept ? 'docs.proposal.accepted' : 'docs.proposal.rejected',
          targetId: proposal.id,
          metadata: {
            pageId,
            authorId: proposal.authorId,
            changes: contentChanges(proposal, resolved!, ['state'])
          }
        });
        return resolved!;
      });
    },
    {
      body: t.Object({ accept: t.Boolean(), note: t.Optional(t.String({ maxLength: 1000 })) })
    }
  )
  .post('/docs/proposals/:id/withdraw', async ({ db, user, params }) => {
    const actor = active(user);
    return db.transaction(async (tx) => {
      const [proposal] = await tx
        .select()
        .from(docProposals)
        .where(eq(docProposals.id, params.id))
        .for('update');
      if (!proposal) throw status(404, { code: 'PROPOSAL_NOT_FOUND' });
      if (proposal.authorId !== actor.id) throw status(403, { code: 'FORBIDDEN' });
      if (proposal.state !== 'pending') throw status(409, { code: 'PROPOSAL_ALREADY_RESOLVED' });
      const [withdrawn] = await tx
        .update(docProposals)
        .set({ state: 'withdrawn', reviewedAt: new Date() })
        .where(eq(docProposals.id, proposal.id))
        .returning();
      await recordEvent(tx, {
        actorId: actor.id,
        projectId: proposal.projectId,
        action: 'docs.proposal.withdrawn',
        targetId: proposal.id,
        metadata: { pageId: proposal.pageId }
      });
      return withdrawn!;
    });
  })
  .get(
    '/docs/contributors',
    async ({ db, user, query }) => {
      const actor = active(user);
      const projectId = query.projectId ?? null;
      await docsAccess(db, actor, projectId);
      const contributors = await contributorStats(db, workspaceCondition(projectId));
      const suggestions = await db
        .select({
          userId: docProposals.authorId,
          state: docProposals.state,
          count: sql<number>`count(*)::int`
        })
        .from(docProposals)
        .where(projectId ? eq(docProposals.projectId, projectId) : isNull(docProposals.projectId))
        .groupBy(docProposals.authorId, docProposals.state);
      const [totals] = await db
        .select({
          pages: sql<number>`count(distinct ${docPages.id})::int`,
          revisions: sql<number>`count(${docRevisions.id})::int`
        })
        .from(docPages)
        .leftJoin(docRevisions, eq(docRevisions.pageId, docPages.id))
        .where(workspaceCondition(projectId));
      const count = (userId: string, state: string) =>
        suggestions.find((row) => row.userId === userId && row.state === state)?.count ?? 0;
      return {
        pages: totals?.pages ?? 0,
        revisions: totals?.revisions ?? 0,
        contributors: contributors.map((row) => ({
          ...row,
          accepted: count(row.user.id, 'accepted'),
          pending: count(row.user.id, 'pending'),
          rejected: count(row.user.id, 'rejected')
        }))
      };
    },
    { query: projectQuery }
  )
  .get(
    '/public/docs',
    async ({ db, user, query }) => {
      // Active members read every page in the dashboard, so the website shows them every page too.
      const member = user?.membershipStatus === 'active';
      const rows = await db
        .select({
          slug: docPages.slug,
          folder: docPages.folder,
          folderId: docPages.folderId,
          projectId: docPages.projectId,
          title: docPages.title,
          markdown: docPages.markdown,
          translations: docPages.translations,
          public: docPages.public,
          updatedAt: docPages.updatedAt,
          projectSlug: projects.slug,
          projectName: projects.name
        })
        .from(docPages)
        .leftJoin(projects, eq(docPages.projectId, projects.id))
        .where(member ? undefined : eq(docPages.public, true))
        .orderBy(docPages.title);
      const folders = await db.select().from(docFolders);
      return rows.map(({ markdown, translations, projectId: _projectId, folderId, ...row }) => {
        const shown = readable({ title: row.title, markdown, translations }, query.locale);
        return {
          ...row,
          folder: docFolderPath(folders, folderId, query.locale),
          folderTrail: docFolderTrail(folders, folderId, query.locale),
          title: shown.title,
          excerpt: markdownExcerpt(shown.markdown)
        };
      });
    },
    { query: t.Object({ locale }) }
  )
  .get(
    '/public/docs/:workspace/:slug',
    async ({ db, user, params, query }) => {
      const reader = user?.membershipStatus === 'active' ? user : null;
      const [project] =
        params.workspace === associationDocsKey
          ? [null]
          : await db
              .select({ id: projects.id, slug: projects.slug, name: projects.name })
              .from(projects)
              .where(eq(projects.slug, params.workspace));
      if (project === undefined) throw status(404, { code: 'DOC_NOT_FOUND' });
      const [page] = await db
        .select()
        .from(docPages)
        .where(
          and(
            workspaceCondition(project?.id ?? null),
            eq(docPages.slug, params.slug),
            reader ? undefined : eq(docPages.public, true)
          )
        );
      if (!page) throw status(404, { code: 'DOC_NOT_FOUND' });
      const current: Workspace = {
        projectId: project?.id ?? null,
        slug: project?.slug ?? null,
        name: project?.name ?? null
      };
      const shown = readable(page, query.locale);
      const history = await db
        .select({
          version: docRevisions.version,
          title: docRevisions.title,
          markdown: docRevisions.markdown,
          translations: docRevisions.translations
        })
        .from(docRevisions)
        .where(eq(docRevisions.pageId, page.id))
        .orderBy(docRevisions.version);
      const resolve = await docLinkResolver(db, shown.markdown, current, {
        publicOnly: !reader,
        href: publicHref,
        locale: query.locale
      });
      return {
        title: shown.title,
        slug: page.slug,
        public: page.public,
        folder: docFolderPath(
          await workspaceFolders(db, project?.id ?? null),
          page.folderId,
          query.locale
        ),
        locale: shown.locale,
        locales: ['en', ...Object.keys(cleanDocTranslations(page.translations))] as ContentLocale[],
        outdatedLocales: outdatedTranslations(history),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        workspace: { slug: current.slug, name: current.name },
        headings: markdownHeadings(shown.markdown),
        blocks: renderMarkdown(shown.markdown, { docs: { resolve } }),
        // Members get the dashboard's editing rights, so the website can link to the editor.
        access: reader ? await docsAccess(db, reader, current.projectId) : null
      };
    },
    { query: t.Object({ locale }) }
  );
