import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getUrls } from 'shared';
import contentRoutes from '../routes/platform/content';
import collaborationRoutes from '../routes/platform/collaboration';
import {
  db,
  users,
  sessions,
  frontendSessions,
  projects,
  projectMembers,
  joinRequests,
  projectLinks,
  articles,
  articleRevisions,
  articleProposals,
  articleContributors,
  boards,
  kanbanItems,
  threads,
  comments,
  auditEvents,
  outbox,
  fileReferences
} from '../db';

const disposable =
  !!process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === '/ksi_integration';
const suffix = createId();
const actors = ['board', 'leader', 'member', 'outsider', 'pending'] as const;
type Actor = (typeof actors)[number];
const ids = Object.fromEntries(
  actors.map((actor) => [actor, `content-${actor}-${suffix}`])
) as Record<Actor, string>;
const tokens = Object.fromEntries(actors.map((actor) => [actor, createId()])) as Record<
  Actor,
  string
>;
const projectIds: string[] = [];
let projectId: string, boardId: string, articleId: string;
const headers = (actor: Actor) => ({
  'content-type': 'application/json',
  'x-ksi-proxy-key': process.env.PROXY_SECRET!,
  'x-ksi-session': tokens[actor],
  'x-ksi-origin': getUrls().frontend.dashboard
});
async function content(path: string, actor: Actor, method = 'GET', body?: unknown) {
  const response = await contentRoutes.handle(
    new Request(`http://localhost/platform${path}`, {
      method,
      headers: headers(actor),
      ...(body ? { body: JSON.stringify(body) } : {})
    })
  );
  return { status: response.status, body: (await response.json()) as any };
}
async function collaboration(path: string, actor: Actor, method = 'GET', body?: unknown) {
  const response = await collaborationRoutes.handle(
    new Request(`http://localhost/platform${path}`, {
      method,
      headers: headers(actor),
      ...(body ? { body: JSON.stringify(body) } : {})
    })
  );
  return { status: response.status, body: (await response.json()) as any };
}

describe.skipIf(!disposable)('Postgres persisted content and collaboration', () => {
  beforeAll(async () => {
    if (!process.env.PROXY_SECRET || getUrls().environment !== 'integration')
      throw new Error('Isolated integration credentials/environment required');
    await db.insert(users).values(
      actors.map((actor) => ({
        id: ids[actor],
        name: `${actor} Integration`,
        firstName: actor,
        lastName: 'Integration',
        email: `${actor}-${suffix}@example.invalid`,
        membershipStatus: actor === 'pending' ? ('pending' as const) : ('active' as const),
        role: actor === 'board' ? ('board' as const) : ('member' as const)
      }))
    );
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    for (const actor of actors) {
      const sessionId = createId();
      await db.insert(sessions).values({
        id: sessionId,
        token: createId(),
        userId: ids[actor],
        expiresAt: expiry,
        updatedAt: new Date()
      });
      await db.insert(frontendSessions).values({
        id: new Bun.CryptoHasher('sha256').update(tokens[actor]).digest('hex'),
        sessionId,
        origin: getUrls().frontend.dashboard,
        environment: 'integration',
        expiresAt: expiry
      });
    }
  });
  afterAll(async () => {
    const userIds = Object.values(ids);
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, userIds));
    if (events.length) {
      await db.delete(outbox).where(
        inArray(
          outbox.eventId,
          events.map((e) => e.id)
        )
      );
      await db.delete(auditEvents).where(
        inArray(
          auditEvents.id,
          events.map((e) => e.id)
        )
      );
    }
    const authored = await db
      .select({ id: articles.id })
      .from(articles)
      .where(inArray(articles.createdBy, userIds));
    if (authored.length) {
      const articleIds = authored.map((a) => a.id);
      const revisions = await db
        .select({ id: articleRevisions.id })
        .from(articleRevisions)
        .where(inArray(articleRevisions.articleId, articleIds));
      const proposals = await db
        .select({ id: articleProposals.id })
        .from(articleProposals)
        .where(inArray(articleProposals.articleId, articleIds));
      await db
        .delete(fileReferences)
        .where(
          inArray(fileReferences.ownerId, [
            ...articleIds,
            ...revisions.map((r) => r.id),
            ...proposals.map((p) => p.id)
          ])
        );
      await db
        .delete(articleContributors)
        .where(inArray(articleContributors.articleId, articleIds));
      await db.delete(articleRevisions).where(inArray(articleRevisions.articleId, articleIds));
      await db.delete(articleProposals).where(inArray(articleProposals.articleId, articleIds));
      await db.delete(articles).where(inArray(articles.id, articleIds));
    }
    await db.delete(comments).where(inArray(comments.authorId, userIds));
    await db.delete(threads).where(inArray(threads.authorId, userIds));
    await db.delete(kanbanItems).where(inArray(kanbanItems.authorId, userIds));
    if (projectIds.length) {
      await db.delete(boards).where(inArray(boards.projectId, projectIds));
      await db.delete(joinRequests).where(inArray(joinRequests.projectId, projectIds));
      await db.delete(projectMembers).where(inArray(projectMembers.projectId, projectIds));
      await db.delete(projectLinks).where(inArray(projectLinks.projectId, projectIds));
      await db.delete(projects).where(inArray(projects.id, projectIds));
    }
    const sessionRows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.userId, userIds));
    if (sessionRows.length)
      await db.delete(frontendSessions).where(
        inArray(
          frontendSessions.sessionId,
          sessionRows.map((s) => s.id)
        )
      );
    await db.delete(sessions).where(inArray(sessions.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  });
  test('pending and ordinary members cannot create projects; board creates persistent leader membership', async () => {
    const input = {
      slug: `krasnal-${suffix}`,
      name: 'Krasnal',
      tags: ['ML'],
      fields: ['research', 'engineering'],
      leaderIds: [ids.leader]
    };
    expect((await content('/projects', 'pending', 'POST', input)).status).toBe(403);
    expect((await content('/projects', 'member', 'POST', input)).status).toBe(403);
    const response = await content('/projects', 'board', 'POST', input);
    expect(response.status).toBe(200);
    projectId = response.body.id;
    projectIds.push(projectId);
    const [leader] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, ids.leader)));
    expect(leader?.leader).toBe(true);
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(eq(auditEvents.projectId, projectId));
    expect(events).toHaveLength(1);
    const deliveries = await db.select().from(outbox).where(eq(outbox.eventId, events[0]!.id));
    expect(deliveries).toHaveLength(1);
  });
  test('open joins are idempotent and final leader cannot leave', async () => {
    expect((await content(`/projects/${projectId}/join`, 'member', 'POST')).body.state).toBe(
      'member'
    );
    expect((await content(`/projects/${projectId}/join`, 'member', 'POST')).body.state).toBe(
      'member'
    );
    const memberships = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, ids.member)));
    expect(memberships).toHaveLength(1);
    expect(
      (await content(`/projects/${projectId}/members/${ids.leader}`, 'leader', 'DELETE')).status
    ).toBe(409);
  });
  test('locked project join requests require a leader decision', async () => {
    const locked = await content(`/projects/${projectId}`, 'leader', 'PATCH', {
      version: 1,
      locked: true
    });
    expect(locked.status).toBe(200);
    expect((await content(`/projects/${projectId}/join`, 'outsider', 'POST')).body.state).toBe(
      'request'
    );
    const requests = await content(`/projects/${projectId}/join-requests`, 'leader');
    expect(requests.body).toHaveLength(1);
    const requestId = requests.body[0].request.id;
    expect(
      (
        await content(`/projects/${projectId}/join-requests/${requestId}`, 'member', 'POST', {
          accept: true
        })
      ).status
    ).toBe(403);
    expect(
      (
        await content(`/projects/${projectId}/join-requests/${requestId}`, 'leader', 'POST', {
          accept: false
        })
      ).status
    ).toBe(200);
    expect(
      (
        await content(`/projects/${projectId}/join-requests/${requestId}`, 'leader', 'POST', {
          accept: true
        })
      ).status
    ).toBe(409);
  });
  test('ordinary project leader can edit layout but explicit denial wins', async () => {
    expect(
      (
        await content(`/projects/${projectId}/layout`, 'leader', 'PUT', {
          version: 2,
          layout: [
            { type: 'main-article', hidden: false },
            { type: 'leaders', hidden: false }
          ]
        })
      ).status
    ).toBe(200);
    await db
      .update(users)
      .set({ flags: ['-projects.layout.edit'] })
      .where(eq(users.id, ids.leader));
    expect(
      (
        await content(`/projects/${projectId}/layout`, 'leader', 'PUT', {
          version: 3,
          layout: [{ type: 'leaders', hidden: true }]
        })
      ).status
    ).toBe(403);
    await db.update(users).set({ flags: [] }).where(eq(users.id, ids.leader));
  });
  test('drafts, proposals and leader publication persist with optimistic conflicts and private author credits', async () => {
    const created = await content('/articles', 'leader', 'POST', {
      projectId,
      slug: `building-krasnal-${suffix}`,
      title: 'Building Krasnal',
      markdown: 'Initial draft',
      language: 'en'
    });
    expect(created.status).toBe(200);
    articleId = created.body.id;
    expect((await content(`/articles/by-slug/${created.body.slug}`, 'leader')).body.id).toBe(
      articleId
    );
    expect((await content(`/articles/by-slug/${created.body.slug}`, 'outsider')).status).toBe(403);
    expect((await content(`/articles/by-slug/${created.body.slug}`, 'pending')).status).toBe(403);
    const hidden = await contentRoutes.handle(
      new Request(`http://localhost/platform/public/articles/${created.body.slug}`)
    );
    expect(hidden.status).toBe(404);
    expect(
      (
        await content(`/articles/${articleId}/proposals`, 'outsider', 'POST', {
          baseVersion: 1,
          title: 'Unauthorized',
          markdown: 'No'
        })
      ).status
    ).toBe(403);
    const first = await content(`/articles/${articleId}/proposals`, 'member', 'POST', {
      baseVersion: 1,
      title: 'Building Krasnal',
      markdown: 'Suggested content'
    });
    const second = await content(`/articles/${articleId}/proposals`, 'member', 'POST', {
      baseVersion: 1,
      title: 'Building Krasnal',
      markdown: 'Conflicting content'
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      (
        await content(
          `/articles/${articleId}/proposals/${first.body.id}/resolve`,
          'leader',
          'POST',
          { accept: true }
        )
      ).status
    ).toBe(200);
    expect(
      (
        await content(
          `/articles/${articleId}/proposals/${second.body.id}/resolve`,
          'leader',
          'POST',
          { accept: true }
        )
      ).status
    ).toBe(409);
    const published = await content(`/articles/${articleId}`, 'leader', 'PUT', {
      version: 2,
      title: 'Building Krasnal',
      markdown: 'Final content',
      state: 'published',
      mainArticle: true,
      projectFeed: false,
      websiteFeed: false
    });
    expect(published.status).toBe(200);
    let publicArticle = (await (
      await contentRoutes.handle(
        new Request(`http://localhost/platform/public/articles/${created.body.slug}`)
      )
    ).json()) as any;
    expect(publicArticle.markdown).toBe('Final content');
    expect(publicArticle.authors).toHaveLength(0);
    expect(publicArticle.createdBy).toBeUndefined();
    expect(
      (await content(`/articles/${articleId}/credit`, 'member', 'PUT', { publicCredit: true }))
        .status
    ).toBe(200);
    publicArticle = (await (
      await contentRoutes.handle(
        new Request(`http://localhost/platform/public/articles/${created.body.slug}`)
      )
    ).json()) as any;
    expect(publicArticle.authors).toHaveLength(1);
    expect(publicArticle.authors[0].name).toBe('member I.');
    expect(publicArticle.authors[0].email).toBeUndefined();
    expect(publicArticle.project.slug).toBeTruthy();
    expect(publicArticle.publishedAt).toBe(published.body.publishedAt);
    expect(
      (await content(`/articles/by-slug/${created.body.slug}`, 'member')).body.publicCredit
    ).toBe(true);
    expect(
      (await content(`/articles/by-slug/${created.body.slug}`, 'leader')).body.publicCredit
    ).toBe(false);
    const edited = await content(`/articles/${articleId}`, 'leader', 'PUT', {
      version: 3,
      title: 'Building Krasnal',
      markdown: 'Updated content',
      state: 'published',
      mainArticle: true,
      projectFeed: false,
      websiteFeed: false
    });
    expect(edited.status).toBe(200);
    expect(edited.body.publishedAt).toBe(published.body.publishedAt);
    const recommendation = await db
      .insert(articles)
      .values({
        projectId,
        createdBy: ids.leader,
        slug: `recommended-${suffix}`,
        title: 'Recommended',
        state: 'published',
        projectFeed: true,
        publishedAt: new Date(),
        translations: { pl: { title: 'Polecany' } }
      })
      .returning();
    await db.insert(articles).values([
      {
        projectId,
        createdBy: ids.leader,
        slug: `hidden-${suffix}`,
        title: 'Unlisted',
        state: 'published',
        websiteFeed: false,
        projectFeed: false
      },
      {
        projectId,
        createdBy: ids.leader,
        slug: `draft-${suffix}`,
        title: 'Draft',
        state: 'draft',
        websiteFeed: true
      }
    ]);
    const recommendations = (await (
      await contentRoutes.handle(
        new Request(`http://localhost/platform/public/articles/${created.body.slug}?locale=pl`)
      )
    ).json()) as any;
    expect(
      recommendations.related.some(
        (a: any) => a.id === recommendation[0]!.id && a.title === 'Polecany'
      )
    ).toBe(true);
    expect(
      recommendations.related.some(
        (a: any) =>
          a.slug === `hidden-${suffix}` || a.slug === `draft-${suffix}` || a.id === articleId
      )
    ).toBe(false);
  });
  test('only accepted proposals make their authors article contributors', async () => {
    const created = await content('/articles', 'leader', 'POST', {
      projectId,
      slug: `rejected-proposal-${suffix}`,
      title: 'Rejected proposal',
      markdown: 'Draft',
      language: 'en'
    });
    const credit = () =>
      content(`/articles/${created.body.id}/credit`, 'member', 'PUT', { publicCredit: true });
    const proposal = await content(`/articles/${created.body.id}/proposals`, 'member', 'POST', {
      baseVersion: 1,
      title: 'Rejected proposal',
      markdown: 'Change'
    });
    expect(proposal.status).toBe(200);
    expect((await credit()).status).toBe(403);
    const resolved = await content(
      `/articles/${created.body.id}/proposals/${proposal.body.id}/resolve`,
      'leader',
      'POST',
      { accept: false }
    );
    expect(resolved.status).toBe(200);
    expect((await credit()).status).toBe(403);
  });
  test('board tags, task movement, tombstones and leader-only restoration', async () => {
    const board = await collaboration('/boards', 'leader', 'POST', { projectId });
    expect(board.status).toBe(200);
    boardId = board.body.id;
    expect(
      (await collaboration(`/boards/${boardId}/tags`, 'leader', 'PUT', { tags: ['ML'] })).status
    ).toBe(200);
    expect(
      (
        await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
          title: 'Wrong tag',
          markdown: '',
          column: 'todo',
          position: 0,
          tags: ['Other board']
        })
      ).status
    ).toBe(422);
    const task = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
      title: 'Evaluate model',
      markdown: 'Baseline',
      column: 'todo',
      position: 0,
      tags: ['ML']
    });
    expect(task.status).toBe(200);
    const moved = await collaboration(`/items/${task.body.id}`, 'member', 'PATCH', {
      version: 1,
      column: 'progress',
      position: 2
    });
    expect(moved.status).toBe(200);
    expect(
      (
        await collaboration(`/items/${task.body.id}`, 'member', 'PATCH', {
          version: 1,
          column: 'done'
        })
      ).status
    ).toBe(409);
    expect(
      (await collaboration(`/items/${task.body.id}`, 'member', 'DELETE', { version: 2 })).status
    ).toBe(200);
    expect((await collaboration(`/boards/${boardId}/items`, 'member')).body).toHaveLength(0);
    expect((await collaboration(`/boards/${boardId}/items?graveyard=true`, 'member')).status).toBe(
      403
    );
    expect(
      (await collaboration(`/boards/${boardId}/items?graveyard=true`, 'leader')).body
    ).toHaveLength(1);
    expect(
      (await collaboration(`/items/${task.body.id}/restore`, 'member', 'POST', { version: 3 }))
        .status
    ).toBe(403);
    expect(
      (await collaboration(`/items/${task.body.id}/restore`, 'leader', 'POST', { version: 3 }))
        .status
    ).toBe(200);
    expect(
      (
        await collaboration(`/items/${task.body.id}/comments`, 'member', 'POST', {
          markdown: 'Ready for evaluation'
        })
      ).status
    ).toBe(200);
  });
  test('restricted forums hide threads until invited; archives block new comments but preserve history', async () => {
    const thread = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Leader discussion',
      markdown: 'Initial message',
      visibility: 'leaders',
      invitedIds: []
    });
    expect(thread.status).toBe(200);
    expect((await collaboration(`/threads/${thread.body.id}`, 'member')).status).toBe(404);
    expect((await collaboration(`/threads?projectId=${projectId}`, 'member')).body).toHaveLength(0);
    expect((await collaboration(`/threads/${thread.body.id}`, 'board')).status).toBe(200);
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/access`, 'leader', 'PUT', {
          version: 1,
          visibility: 'leaders',
          invitedIds: [ids.member]
        })
      ).status
    ).toBe(200);
    const reply = await collaboration(`/threads/${thread.body.id}/comments`, 'member', 'POST', {
      markdown: 'Invited reply'
    });
    expect(reply.status).toBe(200);
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/archive`, 'leader', 'POST', {
          version: 2,
          archived: true
        })
      ).status
    ).toBe(200);
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/comments`, 'member', 'POST', {
          markdown: 'Late reply'
        })
      ).status
    ).toBe(409);
    expect(
      (
        await collaboration(`/comments/${reply.body.id}`, 'member', 'PATCH', {
          markdown: 'Rewritten'
        })
      ).status
    ).toBe(409);
    expect((await collaboration(`/comments/${reply.body.id}`, 'member', 'DELETE')).status).toBe(
      409
    );
    expect(
      (await collaboration(`/threads/${thread.body.id}`, 'member')).body.comments
    ).toHaveLength(2);
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/archive`, 'leader', 'POST', {
          version: 3,
          archived: false
        })
      ).status
    ).toBe(200);
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/comments`, 'member', 'POST', {
          markdown: 'Restored reply'
        })
      ).status
    ).toBe(200);
  });
  test('member profiles list only articles shown on the site', async () => {
    const [listed, unlisted] = await db
      .insert(articles)
      .values([
        {
          projectId,
          createdBy: ids.leader,
          slug: `profile-listed-${suffix}`,
          title: 'Listed',
          state: 'published',
          websiteFeed: true
        },
        {
          projectId,
          createdBy: ids.leader,
          slug: `profile-unlisted-${suffix}`,
          title: 'Unlisted',
          state: 'published'
        }
      ])
      .returning();
    await db.insert(articleContributors).values(
      [listed!, unlisted!].map((a) => ({
        articleId: a.id,
        userId: ids.board,
        publicCredit: true
      }))
    );
    const profile = (await (
      await contentRoutes.handle(
        new Request(`http://localhost/platform/public/members/${ids.board}`)
      )
    ).json()) as any;
    const slugs = profile.articles.map((a: any) => a.slug);
    expect(slugs).toContain(listed!.slug);
    expect(slugs).not.toContain(unlisted!.slug);
  });
  test('scope denial blocks unrelated publishing and audit history', async () => {
    expect((await content(`/articles/${articleId}`, 'outsider')).status).toBe(403);
    expect((await collaboration(`/events?projectId=${projectId}`, 'member')).status).toBe(403);
    const history = await collaboration(`/events?projectId=${projectId}`, 'leader');
    expect(history.status).toBe(200);
    expect(history.body.length).toBeGreaterThan(5);
  });
});
