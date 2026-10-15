import { localizeContent, articleMarkdown } from 'shared/content-locales';
import { relatedArticles } from '../../domain/related-articles';
import { and, eq, inArray, desc, sql, or } from 'drizzle-orm';
import { status, t } from 'elysia';
import { syncFileReferences } from './files';
import { createElysia, requirePermission } from '../../lib/createElysia';
import { recordEvent, type Executor } from '../../lib/audit';
import {
  users,
  projects,
  projectMembers,
  projectLinks,
  joinRequests,
  articles,
  articleRevisions,
  articleProposals,
  articleContributors,
  threads
} from '../../db';
import { displayName } from '../../domain/profiles';
import { hasScopedLeadership, canEditScope, safeLink } from '../../domain/content-policy';
import {
  fields,
  sectionTypes,
  validateLayout,
  visibleSections,
  visibleMemberIds
} from '../../domain/projects';
import {
  type Principal,
  type Permission,
  type ResourceScope,
  canContribute
} from '../../domain/permissions';

const shortText = t.String({ minLength: 1, maxLength: 200 });
const slug = t.String({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 100 });
const tagList = t.Array(t.String({ minLength: 1, maxLength: 50 }), {
  maxItems: 30,
  uniqueItems: true
});
const projectFields = t.Array(t.Union(fields.map((f) => t.Literal(f))), {
  minItems: 1,
  maxItems: 3,
  uniqueItems: true
});
const layoutType = t.Array(
  t.Object({ type: t.Union(sectionTypes.map((f) => t.Literal(f))), hidden: t.Boolean() }),
  { maxItems: 5 }
);
const defaultLayout = sectionTypes.map((type) => ({ type, hidden: false }));
export function active(user: typeof users.$inferSelect | null): typeof users.$inferSelect {
  if (!user) throw status(401, { code: 'AUTH_REQUIRED' });
  if (user.membershipStatus !== 'active')
    throw status(403, {
      code: user.membershipStatus === 'pending' ? 'ACCOUNT_PENDING' : 'FORBIDDEN',
      contact: Bun.env.ACTIVATION_CONTACT ?? 'KSI board'
    });
  return user;
}
export async function scopeFor(
  executor: Executor,
  projectId: string | null
): Promise<ResourceScope> {
  if (!projectId) return { association: true, memberIds: [], leaderIds: [] };
  const [project] = await executor
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) throw status(404, { code: 'PROJECT_NOT_FOUND' });
  const memberships = await executor
    .select({ userId: projectMembers.userId, leader: projectMembers.leader })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(eq(projectMembers.projectId, projectId), eq(users.membershipStatus, 'active')));
  return {
    memberIds: memberships.map((m) => m.userId),
    leaderIds: memberships.filter((m) => m.leader).map((m) => m.userId)
  };
}
export function requireLeader(user: Principal, scope: ResourceScope, permission: Permission) {
  if (!hasScopedLeadership(user, scope, permission)) throw status(403, { code: 'FORBIDDEN' });
}
export function publicProfile(user: typeof users.$inferSelect, locale?: string) {
  const localized = user.membershipStatus === 'deleted' ? user : localizeContent(user, locale);
  return {
    id: user.id,
    name:
      user.membershipStatus === 'deleted'
        ? user.name
        : displayName(localized) || localized.nickname || 'Member',
    image: user.image,
    bio: localized.bio,
    nickname: user.membershipStatus === 'deleted' ? null : localized.nickname,
    github: user.github,
    linkedin: user.linkedin
  };
}
// The creator is only shown through articleCredits, which honors their public credit choice.
function publicArticle(article: typeof articles.$inferSelect, locale?: string) {
  const { createdBy: _creator, ...visible } = localizeContent(article, locale);
  return visible;
}
async function articleCredits(executor: Executor, articleId: string, locale?: string) {
  const records = await executor
    .select({ user: users })
    .from(articleContributors)
    .innerJoin(users, eq(articleContributors.userId, users.id))
    .where(
      and(eq(articleContributors.articleId, articleId), eq(articleContributors.publicCredit, true))
    );
  return records.map((r) => publicProfile(r.user, locale));
}
async function articleScope(executor: Executor, articleId: string) {
  const [article] = await executor.select().from(articles).where(eq(articles.id, articleId));
  if (!article) throw status(404, { code: 'ARTICLE_NOT_FOUND' });
  return { article, scope: await scopeFor(executor, article.projectId) };
}

// Protected roster views deliberately omit email, flags and authentication data.
const memberFields = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  nickname: users.nickname,
  bio: users.bio,
  image: users.image,
  role: users.role,
  github: users.github,
  linkedin: users.linkedin
};

export default createElysia({ prefix: '/platform' })
  .get('/public/members', async ({ db, query }) =>
    (await db.select().from(users).where(eq(users.membershipStatus, 'active'))).map((user) =>
      publicProfile(user, typeof query.locale === 'string' ? query.locale : undefined)
    )
  )
  .get('/public/members/:id', async ({ db, params, query }) => {
    const [member] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, params.id), eq(users.membershipStatus, 'active')));
    if (!member) throw status(404, { code: 'MEMBER_NOT_FOUND' });
    const locale = typeof query.locale === 'string' ? query.locale : undefined;
    const authored = await db
      .select({ article: articles })
      .from(articleContributors)
      .innerJoin(articles, eq(articleContributors.articleId, articles.id))
      .where(
        and(
          eq(articleContributors.userId, member.id),
          eq(articleContributors.publicCredit, true),
          eq(articles.state, 'published'),
          or(
            eq(articles.websiteFeed, true),
            eq(articles.projectFeed, true),
            eq(articles.mainArticle, true)
          )
        )
      )
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt));
    return {
      ...publicProfile(member, locale),
      articles: await Promise.all(
        authored.map(async ({ article }) => ({
          ...publicArticle(article, locale),
          authors: await articleCredits(db, article.id, locale)
        }))
      )
    };
  })
  .get('/public/projects', async ({ db, query }) =>
    (await db.select().from(projects).orderBy(desc(projects.createdAt))).map((project) =>
      localizeContent(project, typeof query.locale === 'string' ? query.locale : undefined)
    )
  )
  .get('/public/projects/:slug', async ({ db, params, query }) => {
    const [project] = await db.select().from(projects).where(eq(projects.slug, params.slug));
    if (!project) throw status(404, { code: 'PROJECT_NOT_FOUND' });
    const roster = await db
      .select({ user: users, leader: projectMembers.leader })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(and(eq(projectMembers.projectId, project.id), eq(users.membershipStatus, 'active')));
    const published = await db
      .select()
      .from(articles)
      .where(and(eq(articles.projectId, project.id), eq(articles.state, 'published')));
    const links = await db
      .select()
      .from(projectLinks)
      .where(eq(projectLinks.projectId, project.id))
      .orderBy(projectLinks.position);
    const publishedLocalized = published.map((article) =>
      publicArticle(article, typeof query.locale === 'string' ? query.locale : undefined)
    );
    const mainArticle = publishedLocalized.find((a) => a.mainArticle) ?? null;
    const feed = await Promise.all(
      publishedLocalized
        .filter((a) => a.projectFeed && !a.mainArticle)
        .map(async (article) => ({
          ...article,
          authors: await articleCredits(
            db,
            article.id,
            typeof query.locale === 'string' ? query.locale : undefined
          )
        }))
    );
    const leaderIds = roster.filter((r) => r.leader).map((r) => r.user.id);
    const layout = project.layout.length ? project.layout : defaultLayout;
    const showLeaders = layout.some((s) => s.type === 'leaders' && !s.hidden);
    const memberIds = visibleMemberIds(
      roster.map((r) => r.user.id),
      leaderIds,
      showLeaders
    );
    const leaders = roster
      .filter((r) => r.leader)
      .map((r) =>
        publicProfile(r.user, typeof query.locale === 'string' ? query.locale : undefined)
      );
    const members = roster
      .filter((r) => memberIds.includes(r.user.id))
      .map((r) =>
        publicProfile(r.user, typeof query.locale === 'string' ? query.locale : undefined)
      );
    return {
      ...localizeContent(project, typeof query.locale === 'string' ? query.locale : undefined),
      leaders,
      members,
      links: links.map((link) =>
        localizeContent(link, typeof query.locale === 'string' ? query.locale : undefined)
      ),
      mainArticle,
      articles: feed,
      sections: visibleSections(layout, {
        leaders: leaders.length,
        members: members.length,
        links: links.length,
        'main-article': mainArticle ? 1 : 0,
        articles: feed.length
      })
    };
  })
  .get('/public/articles', async ({ db, query }) => {
    const records = await db
      .select()
      .from(articles)
      .where(and(eq(articles.state, 'published'), eq(articles.websiteFeed, true)))
      .orderBy(desc(articles.updatedAt));
    return Promise.all(
      records.map(async (a) => ({
        ...publicArticle(a, typeof query.locale === 'string' ? query.locale : undefined),
        authors: await articleCredits(
          db,
          a.id,
          typeof query.locale === 'string' ? query.locale : undefined
        )
      }))
    );
  })
  .get('/public/articles/:slug', async ({ db, params, query }) => {
    const [article] = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, params.slug), eq(articles.state, 'published')));
    if (!article) throw status(404, { code: 'ARTICLE_NOT_FOUND' });
    const locale = typeof query.locale === 'string' ? query.locale : undefined;
    const [project] = article.projectId
      ? await db.select().from(projects).where(eq(projects.id, article.projectId))
      : [];
    const candidates = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        translations: articles.translations,
        projectId: articles.projectId,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        fields: projects.fields,
        projectName: projects.name,
        projectSlug: projects.slug,
        projectTranslations: projects.translations
      })
      .from(articles)
      .leftJoin(projects, eq(articles.projectId, projects.id))
      .where(
        and(
          eq(articles.state, 'published'),
          or(eq(articles.websiteFeed, true), eq(articles.projectFeed, true))
        )
      );
    return {
      ...publicArticle(article, locale),
      authors: await articleCredits(db, article.id, locale),
      project: project
        ? { id: project.id, slug: project.slug, name: localizeContent(project, locale).name }
        : null,
      related: relatedArticles({ ...article, fields: project?.fields ?? [] }, candidates).map(
        (candidate) => ({
          id: candidate.id,
          slug: candidate.slug,
          title: localizeContent(candidate, locale).title,
          publishedAt: candidate.publishedAt,
          project: candidate.projectId
            ? {
                slug: candidate.projectSlug,
                name: localizeContent(
                  {
                    name: candidate.projectName,
                    translations: candidate.projectTranslations ?? {}
                  },
                  locale
                ).name
              }
            : null
        })
      )
    };
  })
  .get('/members', async ({ db, user }) => {
    active(user);
    return db.select(memberFields).from(users).where(eq(users.membershipStatus, 'active'));
  })
  .get('/members/:id', async ({ db, user, params }) => {
    active(user);
    const [member] = await db
      .select(memberFields)
      .from(users)
      .where(and(eq(users.id, params.id), eq(users.membershipStatus, 'active')));
    if (!member) throw status(404, { code: 'MEMBER_NOT_FOUND' });
    return member;
  })
  .get('/projects/:id', async ({ db, user, params }) => {
    const actor = active(user);
    const scope = await scopeFor(db, params.id);
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id));
    return {
      ...project,
      isMember: scope.memberIds.includes(actor.id),
      canEdit: hasScopedLeadership(actor, scope, 'projects.catalog.edit'),
      canManageMembers: hasScopedLeadership(actor, scope, 'projects.membership.manage')
    };
  })
  .get('/projects/:id/members', async ({ db, user, params }) => {
    active(user);
    await scopeFor(db, params.id);
    return db
      .select({ ...memberFields, leader: projectMembers.leader })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(and(eq(projectMembers.projectId, params.id), eq(users.membershipStatus, 'active')));
  })
  .post(
    '/projects',
    async ({ db, user, body }) => {
      const actor = requirePermission(user, 'projects.catalog.create');
      if (new Set(body.leaderIds).size !== body.leaderIds.length)
        throw status(422, { code: 'DUPLICATE_LEADER' });
      return db.transaction(async (tx) => {
        const leaders = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, body.leaderIds), eq(users.membershipStatus, 'active')))
          .for('share');
        if (leaders.length !== body.leaderIds.length)
          throw status(422, { code: 'ACTIVE_LEADER_REQUIRED' });
        const [project] = await tx
          .insert(projects)
          .values({ ...body, layout: defaultLayout })
          .returning();
        if (!project) throw new Error('Project creation failed');
        await tx
          .insert(projectMembers)
          .values(
            body.leaderIds.map((userId) => ({ projectId: project.id, userId, leader: true }))
          );
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: project.id,
          action: 'projects.created',
          targetId: project.id,
          metadata: { version: project.version }
        });
        return project;
      });
    },
    {
      body: t.Object({
        slug,
        name: shortText,
        description: t.Optional(t.String({ maxLength: 10000 })),
        tags: tagList,
        fields: projectFields,
        leaderIds: t.Array(t.String(), { minItems: 1, maxItems: 100, uniqueItems: true })
      })
    }
  )
  .patch(
    '/projects/:id',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const scope = await scopeFor(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        const [project] = await tx
          .update(projects)
          .set({
            name: body.name,
            description: body.description,
            tags: body.tags,
            fields: body.fields,
            locked: body.locked,
            version: sql`${projects.version} + 1`
          })
          .where(and(eq(projects.id, params.id), eq(projects.version, body.version)))
          .returning();
        if (!project) throw status(409, { code: 'REVISION_CONFLICT' });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: project.id,
          action: 'projects.updated',
          targetId: project.id,
          metadata: { version: project.version }
        });
        return project;
      });
    },
    {
      body: t.Object({
        version: t.Integer({ minimum: 1 }),
        name: t.Optional(shortText),
        description: t.Optional(t.String({ maxLength: 10000 })),
        tags: t.Optional(tagList),
        fields: t.Optional(projectFields),
        locked: t.Optional(t.Boolean())
      })
    }
  )
  .put(
    '/projects/:id/layout',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      validateLayout(body.layout);
      return db.transaction(async (tx) => {
        requireLeader(actor, await scopeFor(tx, params.id), 'projects.layout.edit');
        const [project] = await tx
          .update(projects)
          .set({ layout: body.layout, version: sql`${projects.version} + 1` })
          .where(and(eq(projects.id, params.id), eq(projects.version, body.version)))
          .returning();
        if (!project) throw status(409, { code: 'REVISION_CONFLICT' });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: project.id,
          action: 'projects.layout.updated',
          targetId: project.id,
          metadata: { version: project.version }
        });
        return project;
      });
    },
    { body: t.Object({ version: t.Integer({ minimum: 1 }), layout: layoutType }) }
  )
  .get('/projects/:id/links', async ({ db, user, params }) => {
    const actor = active(user);
    requireLeader(actor, await scopeFor(db, params.id), 'projects.catalog.edit');
    return db
      .select()
      .from(projectLinks)
      .where(eq(projectLinks.projectId, params.id))
      .orderBy(projectLinks.position);
  })
  .put(
    '/projects/:id/links',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      if (body.links.some((l) => !safeLink(l.url))) throw status(422, { code: 'INVALID_LINK' });
      return db.transaction(async (tx) => {
        await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, params.id))
          .for('update');
        const scope = await scopeFor(tx, params.id);
        requireLeader(actor, scope, 'projects.catalog.edit');
        // Links are also part of the project layout, so a denial of either permission applies.
        requireLeader(actor, scope, 'projects.layout.edit');
        await tx.delete(projectLinks).where(eq(projectLinks.projectId, params.id));
        if (body.links.length)
          await tx
            .insert(projectLinks)
            .values(body.links.map((l, position) => ({ ...l, position, projectId: params.id })));
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: params.id,
          action: 'projects.links.updated',
          targetId: params.id
        });
        return tx
          .select()
          .from(projectLinks)
          .where(eq(projectLinks.projectId, params.id))
          .orderBy(projectLinks.position);
      });
    },
    {
      body: t.Object({
        links: t.Array(
          t.Object({
            label: shortText,
            url: t.String({ maxLength: 2000 }),
            translations: t.Optional(
              t.Object(
                {
                  pl: t.Optional(
                    t.Object(
                      { label: t.Optional(t.String({ maxLength: 200 })) },
                      { additionalProperties: false }
                    )
                  )
                },
                { additionalProperties: false }
              )
            )
          }),
          {
            maxItems: 50
          }
        )
      })
    }
  )
  .post('/projects/:id/join', async ({ db, user, params }) => {
    const actor = requirePermission(user, 'projects.membership.join');
    return db.transaction(async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, params.id))
        .for('update');
      if (!project) throw status(404, { code: 'PROJECT_NOT_FOUND' });
      const [member] = await tx
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, actor.id)));
      if (member) return { state: 'member' };
      if (project.locked) {
        await tx
          .insert(joinRequests)
          .values({ projectId: project.id, userId: actor.id })
          .onConflictDoUpdate({
            target: [joinRequests.projectId, joinRequests.userId],
            set: { state: 'pending' }
          });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: project.id,
          action: 'projects.join.requested',
          targetId: project.id
        });
        return { state: 'request' };
      }
      await tx
        .insert(projectMembers)
        .values({ projectId: project.id, userId: actor.id })
        .onConflictDoNothing();
      await recordEvent(tx, {
        actorId: actor.id,
        projectId: project.id,
        action: 'projects.membership.joined',
        targetId: actor.id
      });
      return { state: 'member' };
    });
  })
  .delete('/projects/:id/members/:userId', async ({ db, user, params }) => {
    const actor = active(user);
    return db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, params.id))
        .for('update');
      const scope = await scopeFor(tx, params.id);
      if (params.userId === actor.id) requirePermission(actor, 'projects.membership.join');
      else requireLeader(actor, scope, 'projects.membership.manage');
      if (scope.leaderIds.includes(params.userId) && scope.leaderIds.length === 1)
        throw status(409, { code: 'FINAL_PROJECT_LEADER' });
      const [removed] = await tx
        .delete(projectMembers)
        .where(
          and(eq(projectMembers.projectId, params.id), eq(projectMembers.userId, params.userId))
        )
        .returning();
      if (removed) {
        // Restricted thread invitations are only valid for project members.
        await tx
          .update(threads)
          .set({ invitedIds: sql`array_remove(${threads.invitedIds}, ${params.userId})` })
          .where(
            and(
              eq(threads.projectId, params.id),
              sql`${params.userId} = any(${threads.invitedIds})`
            )
          );
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: params.id,
          action: 'projects.membership.removed',
          targetId: params.userId
        });
      }
      return { removed: !!removed };
    });
  })
  .get('/projects/:id/join-requests', async ({ db, user, params }) => {
    const actor = active(user);
    requireLeader(actor, await scopeFor(db, params.id), 'projects.membership.manage');
    return db
      .select({
        request: joinRequests,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image
      })
      .from(joinRequests)
      .innerJoin(users, eq(joinRequests.userId, users.id))
      .where(and(eq(joinRequests.projectId, params.id), eq(joinRequests.state, 'pending')));
  })
  .post(
    '/projects/:id/join-requests/:requestId',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, params.id))
          .for('update');
        requireLeader(actor, await scopeFor(tx, params.id), 'projects.membership.manage');
        const [request] = await tx
          .select()
          .from(joinRequests)
          .where(and(eq(joinRequests.id, params.requestId), eq(joinRequests.projectId, params.id)))
          .for('update');
        if (!request) throw status(404, { code: 'REQUEST_NOT_FOUND' });
        if (request.state !== 'pending') throw status(409, { code: 'REQUEST_ALREADY_RESOLVED' });
        if (body.accept) {
          const [candidate] = await tx
            .select()
            .from(users)
            .where(eq(users.id, request.userId))
            .for('share');
          if (!candidate || candidate.membershipStatus !== 'active')
            throw status(409, { code: 'ACTIVE_MEMBER_REQUIRED' });
          await tx
            .insert(projectMembers)
            .values({ projectId: params.id, userId: request.userId })
            .onConflictDoNothing();
        }
        await tx
          .update(joinRequests)
          .set({ state: body.accept ? 'accepted' : 'rejected' })
          .where(eq(joinRequests.id, request.id));
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: params.id,
          action: body.accept ? 'projects.join.accepted' : 'projects.join.rejected',
          targetId: request.id
        });
        return { accepted: body.accept };
      });
    },
    { body: t.Object({ accept: t.Boolean() }) }
  )
  .put(
    '/projects/:id/leaders',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, params.id))
          .for('update');
        requireLeader(actor, await scopeFor(tx, params.id), 'projects.membership.manage');
        const candidates = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, body.userIds), eq(users.membershipStatus, 'active')))
          .for('share');
        if (candidates.length !== body.userIds.length)
          throw status(422, { code: 'ACTIVE_LEADER_REQUIRED' });
        await tx
          .update(projectMembers)
          .set({ leader: false })
          .where(eq(projectMembers.projectId, params.id));
        for (const userId of body.userIds)
          await tx
            .insert(projectMembers)
            .values({ projectId: params.id, userId, leader: true })
            .onConflictDoUpdate({
              target: [projectMembers.projectId, projectMembers.userId],
              set: { leader: true }
            });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: params.id,
          action: 'projects.leaders.updated',
          targetId: params.id
        });
        return { leaderIds: body.userIds };
      });
    },
    {
      body: t.Object({
        userIds: t.Array(t.String(), { minItems: 1, maxItems: 100, uniqueItems: true })
      })
    }
  )
  .get(
    '/articles',
    async ({ db, user, query }) => {
      const actor = active(user);
      const scope = await scopeFor(db, query.projectId ?? null);
      if (!canContribute(actor, scope)) throw status(403, { code: 'FORBIDDEN' });
      return db
        .select()
        .from(articles)
        .where(
          query.projectId
            ? eq(articles.projectId, query.projectId)
            : sql`${articles.projectId} is null`
        )
        .orderBy(desc(articles.updatedAt));
    },
    { query: t.Object({ projectId: t.Optional(t.String()) }) }
  )
  .post(
    '/articles',
    async ({ db, user, body }) => {
      const actor = requirePermission(user, 'articles.content.propose');
      return db.transaction(async (tx) => {
        const scope = await scopeFor(tx, body.projectId ?? null);
        if (!canEditScope(actor, scope, 'articles.content.propose'))
          throw status(403, { code: 'FORBIDDEN' });
        const [article] = await tx
          .insert(articles)
          .values({ ...body, createdBy: actor.id })
          .returning();
        if (!article) throw new Error('Article creation failed');
        await tx.insert(articleContributors).values({ articleId: article.id, userId: actor.id });
        const [revision] = await tx
          .insert(articleRevisions)
          .values({
            articleId: article.id,
            version: 1,
            title: article.title,
            markdown: article.markdown,
            actorId: actor.id
          })
          .returning();
        await syncFileReferences(tx, 'article', article.id, article.markdown, actor);
        if (revision)
          await syncFileReferences(tx, 'revision', revision.id, articleMarkdown(revision), actor);
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: article.projectId,
          action: 'articles.created',
          targetId: article.id,
          metadata: { version: article.version }
        });
        return article;
      });
    },
    {
      body: t.Object({
        projectId: t.Optional(t.String()),
        slug,
        title: shortText,
        markdown: t.String({ maxLength: 500000 }),
        language: t.Optional(t.Literal('en'))
      })
    }
  )
  .get('/articles/by-slug/:slug', async ({ db, user, params }) => {
    const actor = active(user);
    const [found] = await db.select().from(articles).where(eq(articles.slug, params.slug));
    if (!found) throw status(404, { code: 'ARTICLE_NOT_FOUND' });
    const { article, scope } = await articleScope(db, found.id);
    if (!canContribute(actor, scope)) throw status(403, { code: 'FORBIDDEN' });
    const [credit] = await db
      .select({ publicCredit: articleContributors.publicCredit })
      .from(articleContributors)
      .where(
        and(eq(articleContributors.articleId, article.id), eq(articleContributors.userId, actor.id))
      );
    return { ...article, publicCredit: credit?.publicCredit ?? false, canManageCredit: !!credit };
  })
  .get('/articles/:id', async ({ db, user, params }) => {
    const actor = active(user);
    const { article, scope } = await articleScope(db, params.id);
    if (!canContribute(actor, scope)) throw status(403, { code: 'FORBIDDEN' });
    const revisions = await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, article.id))
      .orderBy(desc(articleRevisions.version));
    const proposals = await db
      .select()
      .from(articleProposals)
      .where(eq(articleProposals.articleId, article.id));
    const contributors = await db
      .select()
      .from(articleContributors)
      .where(eq(articleContributors.articleId, article.id));
    return { ...article, revisions, proposals, contributors };
  })
  .post(
    '/articles/:id/proposals',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'articles.content.propose');
      return db.transaction(async (tx) => {
        const { article, scope } = await articleScope(tx, params.id);
        if (!canEditScope(actor, scope, 'articles.content.propose'))
          throw status(403, { code: 'FORBIDDEN' });
        if (body.baseVersion !== article.version)
          throw status(409, { code: 'REVISION_CONFLICT', currentVersion: article.version });
        const [proposal] = await tx
          .insert(articleProposals)
          .values({ ...body, articleId: article.id, authorId: actor.id })
          .returning();
        if (!proposal) throw new Error('Proposal creation failed');
        await syncFileReferences(tx, 'proposal', proposal.id, proposal.markdown, actor);
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: article.projectId,
          action: 'articles.proposal.created',
          targetId: proposal.id,
          metadata: { articleId: article.id }
        });
        return proposal;
      });
    },
    {
      body: t.Object({
        baseVersion: t.Integer({ minimum: 1 }),
        title: shortText,
        markdown: t.String({ maxLength: 500000 })
      })
    }
  )
  .post(
    '/articles/:id/proposals/:proposalId/resolve',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { article, scope } = await articleScope(tx, params.id);
        requireLeader(actor, scope, 'articles.content.publish');
        const [proposal] = await tx
          .select()
          .from(articleProposals)
          .where(
            and(
              eq(articleProposals.id, params.proposalId),
              eq(articleProposals.articleId, article.id)
            )
          )
          .for('update');
        if (!proposal) throw status(404, { code: 'PROPOSAL_NOT_FOUND' });
        if (proposal.state !== 'pending') throw status(409, { code: 'PROPOSAL_ALREADY_RESOLVED' });
        let current = article;
        if (body.accept) {
          const [updated] = await tx
            .update(articles)
            .set({
              title: body.title ?? proposal.title,
              markdown: body.markdown ?? proposal.markdown,
              version: sql`${articles.version} + 1`,
              updatedAt: new Date()
            })
            .where(and(eq(articles.id, article.id), eq(articles.version, proposal.baseVersion)))
            .returning();
          if (!updated)
            throw status(409, { code: 'REVISION_CONFLICT', currentVersion: article.version });
          current = updated;
          const [revision] = await tx
            .insert(articleRevisions)
            .values({
              articleId: article.id,
              version: updated.version,
              title: updated.title,
              markdown: updated.markdown,
              translations: updated.translations,
              actorId: actor.id
            })
            .returning();
          await syncFileReferences(tx, 'article', updated.id, articleMarkdown(updated), actor);
          if (revision)
            await syncFileReferences(tx, 'revision', revision.id, articleMarkdown(revision), actor);
          await tx
            .insert(articleContributors)
            .values({ articleId: article.id, userId: proposal.authorId })
            .onConflictDoNothing();
        }
        await tx
          .update(articleProposals)
          .set({ state: body.accept ? 'accepted' : 'rejected' })
          .where(eq(articleProposals.id, proposal.id));
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: article.projectId,
          action: body.accept ? 'articles.proposal.accepted' : 'articles.proposal.rejected',
          targetId: proposal.id,
          metadata: { articleId: article.id, version: current.version }
        });
        return current;
      });
    },
    {
      body: t.Object({
        accept: t.Boolean(),
        title: t.Optional(shortText),
        markdown: t.Optional(t.String({ maxLength: 500000 }))
      })
    }
  )
  .put(
    '/articles/:id',
    async ({ db, user, params, body }) => {
      const actor = active(user);
      return db.transaction(async (tx) => {
        const { article, scope } = await articleScope(tx, params.id);
        requireLeader(actor, scope, 'articles.content.publish');
        if (body.mainArticle && !article.projectId) throw status(422, { code: 'PROJECT_REQUIRED' });
        // Serialize main-article selection using the project row.
        if (article.projectId)
          await tx
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.id, article.projectId))
            .for('update');
        if (body.mainArticle)
          await tx
            .update(articles)
            .set({ mainArticle: false })
            .where(eq(articles.projectId, article.projectId!));
        const [updated] = await tx
          .update(articles)
          .set({
            title: body.title,
            markdown: body.markdown,
            state: body.state,
            publishedAt:
              body.state === 'published'
                ? sql`coalesce(${articles.publishedAt}, now())`
                : article.publishedAt,
            mainArticle: body.mainArticle,
            projectFeed: body.projectFeed,
            websiteFeed: body.websiteFeed,
            updatedAt: new Date(),
            version: sql`${articles.version} + 1`
          })
          .where(and(eq(articles.id, article.id), eq(articles.version, body.version)))
          .returning();
        if (!updated) throw status(409, { code: 'REVISION_CONFLICT' });
        const [revision] = await tx
          .insert(articleRevisions)
          .values({
            articleId: article.id,
            version: updated.version,
            title: updated.title,
            markdown: updated.markdown,
            translations: updated.translations,
            actorId: actor.id
          })
          .returning();
        await syncFileReferences(tx, 'article', updated.id, articleMarkdown(updated), actor);
        if (revision)
          await syncFileReferences(tx, 'revision', revision.id, articleMarkdown(revision), actor);
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: article.projectId,
          action: 'articles.updated',
          targetId: article.id,
          metadata: { version: updated.version }
        });
        return updated;
      });
    },
    {
      body: t.Object({
        version: t.Integer({ minimum: 1 }),
        title: shortText,
        markdown: t.String({ maxLength: 500000 }),
        state: t.Union([t.Literal('draft'), t.Literal('published')]),
        mainArticle: t.Boolean(),
        projectFeed: t.Boolean(),
        websiteFeed: t.Boolean()
      })
    }
  )
  .put(
    '/articles/:id/credit',
    async ({ db, user, params, body }) => {
      const actor = requirePermission(user, 'articles.authors.manage-credit');
      return db.transaction(async (tx) => {
        const { article, scope } = await articleScope(tx, params.id);
        if (!canContribute(actor, scope)) throw status(403, { code: 'FORBIDDEN' });
        const [credit] = await tx
          .update(articleContributors)
          .set({ publicCredit: body.publicCredit })
          .where(
            and(
              eq(articleContributors.articleId, article.id),
              eq(articleContributors.userId, actor.id)
            )
          )
          .returning();
        if (!credit) throw status(403, { code: 'CONTRIBUTOR_REQUIRED' });
        await recordEvent(tx, {
          actorId: actor.id,
          projectId: article.projectId,
          action: 'articles.credit.updated',
          targetId: article.id
        });
        return credit;
      });
    },
    { body: t.Object({ publicCredit: t.Boolean() }) }
  );
