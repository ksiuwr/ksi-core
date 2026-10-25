import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getUrls } from 'shared';
import { canReadFile, fileIsPublic } from '../routes/platform/files';
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
  fileReferences,
  files
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
const thumbnailIds = [createId(), createId(), createId()];
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
    await db.delete(files).where(inArray(files.id, thumbnailIds));
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
    const links = { links: [{ label: 'Repository', url: 'https://github.com/ksiuwr/krasnal' }] };
    expect((await content(`/projects/${projectId}/links`, 'leader', 'PUT', links)).status).toBe(
      200
    );
    await db
      .update(users)
      .set({ flags: ['-projects.layout.edit'] })
      .where(eq(users.id, ids.leader));
    expect((await content(`/projects/${projectId}/links`, 'leader', 'PUT', links)).status).toBe(
      403
    );
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
  test('optional thumbnails are explicit, image-only, authorized and retained in revisions', async () => {
    await db.insert(files).values(
      thumbnailIds.map((id, index) => ({
        id,
        uploaderId: index === 2 ? ids.outsider : ids.leader,
        hash: id,
        objectKey: `integration/${id}`,
        environment: 'integration',
        filename: index === 1 ? 'document.pdf' : 'thumbnail.webp',
        mime: index === 1 ? 'application/pdf' : 'image/webp',
        size: 100,
        state: 'private'
      }))
    );
    const draft = {
      projectId,
      title: 'Explicit thumbnail',
      markdown: 'No inline images',
      language: 'en'
    };
    const created = await content('/articles', 'leader', 'POST', {
      ...draft,
      slug: `thumbnail-${suffix}`,
      thumbnailFileId: thumbnailIds[0]
    });
    expect(created.status).toBe(200);
    expect(created.body.thumbnailFileId).toBe(thumbnailIds[0]);
    expect(created.body.markdown).toBe('No inline images');
    expect(await fileIsPublic(db, thumbnailIds[0]!)).toBe(false);

    const rejected = await content('/articles', 'leader', 'POST', {
      ...draft,
      slug: `thumbnail-pdf-${suffix}`,
      thumbnailFileId: thumbnailIds[1]
    });
    expect(rejected.status).toBe(422);
    expect(rejected.body.code).toBe('THUMBNAIL_IMAGE_REQUIRED');
    const forbidden = await content('/articles', 'leader', 'POST', {
      ...draft,
      slug: `thumbnail-private-${suffix}`,
      thumbnailFileId: thumbnailIds[2]
    });
    expect(forbidden.status).toBe(403);

    const update = {
      title: draft.title,
      markdown: draft.markdown,
      state: 'published',
      mainArticle: false,
      projectFeed: true,
      websiteFeed: false
    };
    // Omitting the optional field preserves the chosen thumbnail.
    const published = await content(`/articles/${created.body.id}`, 'leader', 'PUT', {
      ...update,
      version: 1
    });
    expect(published.status).toBe(200);
    expect(published.body.thumbnailFileId).toBe(thumbnailIds[0]);
    expect(await fileIsPublic(db, thumbnailIds[0]!)).toBe(true);
    const publicResult = await contentRoutes.handle(
      new Request(`http://localhost/platform/public/articles/${created.body.slug}`)
    );
    expect(((await publicResult.json()) as any).thumbnailFileId).toBe(thumbnailIds[0]);

    const removed = await content(`/articles/${created.body.id}`, 'leader', 'PUT', {
      ...update,
      version: 2,
      thumbnailFileId: null
    });
    expect(removed.status).toBe(200);
    expect(removed.body.thumbnailFileId).toBeNull();
    expect(await fileIsPublic(db, thumbnailIds[0]!)).toBe(false);
    const [stored] = await db.select().from(files).where(eq(files.id, thumbnailIds[0]!));
    expect(stored!.orphanedAt).toBeNull();
    expect(await canReadFile(db, stored!, null)).toBe(false);
    const history = await content(`/articles/${created.body.id}`, 'leader');
    expect(history.body.revisions.map((revision: any) => revision.thumbnailFileId)).toEqual([
      null,
      thumbnailIds[0],
      thumbnailIds[0]
    ]);

    const plain = await content('/articles', 'leader', 'POST', {
      ...draft,
      slug: `thumbnail-none-${suffix}`,
      markdown: `![Content](file:${thumbnailIds[0]})`
    });
    expect(plain.status).toBe(200);
    expect(plain.body.thumbnailFileId).toBeNull();
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
  test('board labels, task movement, tombstones and leader-only restoration', async () => {
    const board = await collaboration('/boards', 'leader', 'POST', { projectId });
    expect(board.status).toBe(200);
    boardId = board.body.id;
    expect(
      (await collaboration(`/boards/${boardId}/labels`, 'leader', 'PUT', { labels: ['ML'] })).status
    ).toBe(200);
    expect(
      (
        await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
          title: 'Wrong label',
          markdown: '',
          column: 'todo',
          position: 0,
          labels: ['Other board']
        })
      ).status
    ).toBe(422);
    const task = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
      title: 'Evaluate model',
      markdown: 'Baseline',
      column: 'todo',
      position: 0,
      labels: ['ML']
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
      (await collaboration(`/items/${task.body.id}/archive`, 'member', 'POST', { version: 2 }))
        .status
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
  test('structured board labels enforce permissions and preserve task associations on rename', async () => {
    const path = `/boards/${boardId}/labels`;
    const input = { name: 'Bug', color: '#EF4444', description: 'Something is broken' };
    expect((await collaboration(path, 'member', 'POST', input)).status).toBe(403);
    expect((await collaboration(path, 'outsider', 'POST', input)).status).toBe(403);
    expect((await collaboration(path, 'leader', 'POST', { ...input, color: 'red' })).status).toBe(
      422
    );
    expect((await collaboration(path, 'leader', 'POST', { name: '   ' })).status).toBe(422);
    const created = await collaboration(path, 'leader', 'POST', input);
    expect(created.status).toBe(200);
    expect(created.body.labels).toContainEqual({ ...input, color: '#ef4444' });
    expect((await collaboration(path, 'leader', 'POST', { name: ' bug ' })).status).toBe(409);
    const gray = await collaboration(path, 'leader', 'POST', { name: '100% ready' });
    expect(gray.body.labels).toContainEqual({ name: '100% ready', color: '#6b7280' });
    expect(
      (await collaboration(`${path}/${encodeURIComponent('100% ready')}`, 'leader', 'DELETE'))
        .status
    ).toBe(200);
    expect((await collaboration(`${path}/missing`, 'leader', 'DELETE')).status).toBe(404);
    expect(
      (await collaboration(path, 'leader', 'PUT', { labels: [{ name: 'Bug' }, { name: 'bug' }] }))
        .status
    ).toBe(422);

    const tasks = [];
    for (const title of ['Live labelged task', 'Deleted labelged task']) {
      const task = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
        title,
        markdown: '',
        column: 'todo',
        position: 0,
        labels: ['Bug']
      });
      expect(task.status).toBe(200);
      tasks.push(task.body);
    }
    expect(
      (await collaboration(`/items/${tasks[1].id}/archive`, 'member', 'POST', { version: 1 }))
        .status
    ).toBe(200);
    expect((await collaboration(`${path}/Bug`, 'leader', 'DELETE')).status).toBe(409);
    expect((await collaboration(`${path}/Bug`, 'member', 'PATCH', input)).status).toBe(403);
    await db
      .update(users)
      .set({ flags: ['-projects.catalog.edit'] })
      .where(eq(users.id, ids.leader));
    expect((await collaboration(path, 'leader', 'POST', { name: 'Denied' })).status).toBe(403);
    await db.update(users).set({ flags: [] }).where(eq(users.id, ids.leader));
    const renamed = await collaboration(`${path}/Bug`, 'leader', 'PATCH', {
      name: 'Defect',
      color: '#123456',
      description: 'Renamed label'
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.labels).toContainEqual({
      name: 'Defect',
      color: '#123456',
      description: 'Renamed label'
    });
    const stored = await db
      .select()
      .from(kanbanItems)
      .where(
        inArray(
          kanbanItems.id,
          tasks.map((task) => task.id)
        )
      );
    expect(stored.every((task) => task.labels.length === 1 && task.labels[0] === 'Defect')).toBe(
      true
    );
    expect(stored.every((task) => task.version > 1)).toBe(true);
    for (const task of tasks) {
      const timeline = await collaboration(`/items/${task.id}/activity`, 'leader');
      expect(timeline.status).toBe(200);
      const edit = timeline.body.find((event: any) => event.action === 'kanban.label.updated');
      expect(edit?.metadata.changes).toEqual([
        {
          field: 'label',
          before: { name: 'Bug', color: '#ef4444', description: 'Something is broken' },
          after: { name: 'Defect', color: '#123456', description: 'Renamed label' }
        }
      ]);
    }
    const noOpBefore = (await collaboration(`/items/${tasks[0].id}/activity`, 'leader')).body
      .length;
    expect(
      (
        await collaboration(`${path}/Defect`, 'leader', 'PATCH', {
          name: 'Defect',
          color: '#123456',
          description: 'Renamed label'
        })
      ).status
    ).toBe(200);
    expect((await collaboration(`/items/${tasks[0].id}/activity`, 'leader')).body).toHaveLength(
      noOpBefore
    );
    const updatedDefinitions = renamed.body.labels.map((label: any) =>
      label.name === 'Defect' ? { ...label, color: '#abcdef' } : label
    );
    expect(
      (await collaboration(path, 'leader', 'PUT', { labels: updatedDefinitions })).status
    ).toBe(200);
    const colorHistory = await collaboration(`/items/${tasks[0].id}/revisions`, 'member');
    expect(colorHistory.status).toBe(200);
    expect(colorHistory.body.revisions[0].changes).toEqual([
      {
        field: 'label',
        before: { name: 'Defect', color: '#123456', description: 'Renamed label' },
        after: { name: 'Defect', color: '#abcdef', description: 'Renamed label' }
      }
    ]);

    expect(
      (
        await collaboration(`/items/${tasks[0].id}`, 'member', 'PATCH', {
          version: 1,
          labels: ['Bug']
        })
      ).status
    ).toBe(422);
    expect((await collaboration(`${path}/Defect`, 'leader', 'PATCH', { name: 'ML' })).status).toBe(
      422
    );
    expect((await collaboration(`${path}/Defect`, 'leader', 'DELETE')).status).toBe(409);
  });
  test('task label assignments and removals carry their names into the activity timeline', async () => {
    const created = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
      title: 'Label picker fixture',
      markdown: '',
      column: 'todo',
      position: 5,
      labels: ['ML']
    });
    expect(created.status).toBe(200);
    const changed = await collaboration(`/items/${created.body.id}`, 'member', 'PATCH', {
      version: created.body.version,
      labels: ['Defect']
    });
    expect(changed.status).toBe(200);
    const activity = await collaboration(`/items/${created.body.id}/activity`, 'member');
    expect(activity.status).toBe(200);
    const edit = activity.body.find((event: any) => event.action === 'kanban.updated');
    expect(edit?.metadata.changes).toEqual([
      { field: 'labels', before: ['ML'], after: ['Defect'] }
    ]);
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
  test('leaving a project ends restricted thread invitations', async () => {
    const thread = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Invited discussion',
      markdown: 'Initial message',
      visibility: 'leaders',
      invitedIds: [ids.member]
    });
    expect(thread.status).toBe(200);
    expect((await collaboration(`/threads/${thread.body.id}`, 'member')).status).toBe(200);
    const removed = await content(
      `/projects/${projectId}/members/${ids.member}`,
      'leader',
      'DELETE'
    );
    expect(removed.body.removed).toBe(true);
    expect((await collaboration(`/threads/${thread.body.id}`, 'member')).status).toBe(404);
    await db.insert(projectMembers).values({ projectId, userId: ids.member });
  });
  test('task and forum comment edits preserve text diffs and navigation context; denied edits leave no event', async () => {
    const task = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
      title: 'Comment audit fixture',
      markdown: '',
      column: 'todo',
      position: 50,
      labels: []
    });
    expect(task.status).toBe(200);
    const thread = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Comment audit thread',
      markdown: 'Initial post',
      visibility: 'members',
      invitedIds: []
    });
    expect(thread.status).toBe(200);
    for (const [path, context] of [
      [`/items/${task.body.id}/comments`, { itemId: task.body.id, boardId }],
      [`/threads/${thread.body.id}/comments`, { threadId: thread.body.id }]
    ] as const) {
      const created = await collaboration(path, 'member', 'POST', { markdown: 'Original comment' });
      expect(created.status).toBe(200);
      expect(
        (
          await collaboration(`/comments/${created.body.id}`, 'member', 'PATCH', {
            markdown: 'Dupa dupa'
          })
        ).status
      ).toBe(200);
      let events = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.targetId, created.body.id));
      const edit = events.find((event) => event.action === 'comments.edited');
      expect(edit?.metadata).toMatchObject({
        ...context,
        changes: [{ field: 'markdown', before: 'Original comment', after: 'Dupa dupa' }]
      });
      const saved = (
        'itemId' in context
          ? await collaboration(path, 'member')
          : await collaboration(`/threads/${context.threadId}`, 'member')
      ).body;
      const savedComments = 'itemId' in context ? saved : saved.comments;
      expect(savedComments.find((entry: any) => entry.id === created.body.id).edited).toBe(true);
      const count = events.length;
      const denied = await collaboration(`/comments/${created.body.id}`, 'outsider', 'PATCH', {
        markdown: 'Unauthorized'
      });
      expect([403, 404]).toContain(denied.status);
      events = await db.select().from(auditEvents).where(eq(auditEvents.targetId, created.body.id));
      expect(events).toHaveLength(count);
      expect((await collaboration(`/comments/${created.body.id}`, 'member', 'DELETE')).status).toBe(
        200
      );
      const deleted = (
        await db.select().from(auditEvents).where(eq(auditEvents.targetId, created.body.id))
      ).find((event) => event.action === 'comments.removed');
      expect(deleted?.metadata).toMatchObject({
        ...context,
        changes: [{ field: 'markdown', before: 'Dupa dupa', after: null }]
      });
    }
  });
  test('project settings and board configuration retain actual prior values', async () => {
    const created = await content('/projects', 'board', 'POST', {
      slug: `audit-${suffix}`,
      name: 'Audit project',
      tags: [],
      fields: ['engineering'],
      leaderIds: [ids.leader]
    });
    expect(created.status).toBe(200);
    const id = created.body.id;
    projectIds.push(id);
    const links = [{ label: 'Repository', url: 'https://example.test/repository' }];
    expect((await content(`/projects/${id}/links`, 'leader', 'PUT', { links })).status).toBe(200);
    const layout = [
      { type: 'main-article', hidden: false },
      { type: 'leaders', hidden: false }
    ];
    expect(
      (await content(`/projects/${id}/layout`, 'leader', 'PUT', { version: 1, layout })).status
    ).toBe(200);
    expect(
      (
        await content(`/projects/${id}/leaders`, 'leader', 'PUT', {
          userIds: [ids.board, ids.leader]
        })
      ).status
    ).toBe(200);
    const permissions = {
      memberPermissions: ['articles.content.propose'],
      nonMemberPermissions: [],
      groups: [
        { name: 'Contributors', permissions: ['articles.content.propose'], userIds: [ids.leader] }
      ]
    };
    expect(
      (await content(`/projects/${id}/permissions`, 'leader', 'PUT', permissions)).status
    ).toBe(200);
    const events = await db.select().from(auditEvents).where(eq(auditEvents.projectId, id));
    expect(
      events.find((event) => event.action === 'projects.links.updated')?.metadata.changes
    ).toEqual([{ field: 'links', before: [], after: links }]);
    expect(
      events.find((event) => event.action === 'projects.layout.updated')?.metadata.changes
    ).toEqual([{ field: 'layout', before: created.body.layout, after: layout }]);
    expect(
      events.find((event) => event.action === 'projects.leaders.updated')?.metadata.changes
    ).toEqual([
      { field: 'leaderIds', before: [ids.leader], after: [ids.board, ids.leader].sort() }
    ]);
    const permissionChanges = events.find(
      (event) => event.action === 'projects.permissions.updated'
    )?.metadata.changes as any[];
    expect(permissionChanges.find((change) => change.field === 'groups')).toEqual({
      field: 'groups',
      before: [],
      after: permissions.groups
    });
    const board = await collaboration('/boards', 'leader', 'POST', { projectId: id });
    expect(board.status).toBe(200);
    const label = { name: 'Bug', color: '#ef4444', description: 'Broken' };
    const added = await collaboration(`/boards/${board.body.id}/labels`, 'leader', 'POST', label);
    expect(added.status).toBe(200);
    const renamed = await collaboration(`/boards/${board.body.id}/labels/Bug`, 'leader', 'PATCH', {
      ...label,
      name: 'Defect'
    });
    expect(renamed.status).toBe(200);
    const statuses = [...board.body.statuses, { id: 'review', name: 'Review', color: '#123456' }];
    expect(
      (await collaboration(`/boards/${board.body.id}/statuses`, 'leader', 'PUT', { statuses }))
        .status
    ).toBe(200);
    const boardEvents = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.targetId, board.body.id));
    expect(
      boardEvents
        .filter((event) => event.action === 'boards.labels.updated')
        .map((event) => event.metadata.changes)
    ).toContainEqual([{ field: 'labels', before: added.body.labels, after: renamed.body.labels }]);
    expect(
      boardEvents.find((event) => event.action === 'boards.statuses.updated')?.metadata.changes
    ).toEqual([{ field: 'statuses', before: board.body.statuses, after: statuses }]);
  });
  test('content history is readable by ordinary viewers, paginated and scoped to its content', async () => {
    const created = await collaboration(`/boards/${boardId}/items`, 'leader', 'POST', {
      title: 'Original task',
      markdown: 'Original task body',
      position: 60,
      column: 'todo',
      labels: []
    });
    expect(created.status).toBe(200);
    const task = created.body;
    const edited = await collaboration(`/items/${task.id}`, 'leader', 'PATCH', {
      version: task.version,
      title: 'Revised task',
      markdown: 'Revised task body',
      column: 'todo',
      labels: []
    });
    expect(edited.status).toBe(200);
    const history = await collaboration(`/items/${task.id}/revisions`, 'outsider');
    expect(history.status).toBe(200);
    expect(history.body.revisions).toHaveLength(2);
    expect(history.body.nextPage).toBeNull();
    expect(history.body.revisions[0]).toMatchObject({
      kind: 'edited',
      authorName: 'leader Integration',
      changes: [
        { field: 'title', before: 'Original task', after: 'Revised task' },
        { field: 'markdown', before: 'Original task body', after: 'Revised task body' }
      ]
    });
    expect(history.body.revisions[1].kind).toBe('created');
    expect(Object.keys(history.body.revisions[0]).sort()).toEqual(
      ['id', 'createdAt', 'authorName', 'kind', 'changes'].sort()
    );
    expect((await collaboration(`/items/${task.id}/revisions`, 'pending')).status).toBe(403);
    expect((await collaboration(`/items/missing/revisions`, 'member')).status).toBe(404);
    expect((await collaboration(`/items/${task.id}/revisions?page=-1`, 'member')).status).toBe(422);
    expect((await collaboration(`/items/${task.id}/revisions?page=0.5`, 'member')).status).toBe(
      422
    );
    const comment = await collaboration(`/items/${task.id}/comments`, 'leader', 'POST', {
      markdown: 'First version'
    });
    for (let i = 1; i <= 23; i++) {
      expect(
        (
          await collaboration(`/comments/${comment.body.id}`, 'leader', 'PATCH', {
            markdown: `Version ${i}`
          })
        ).status
      ).toBe(200);
    }
    const first = await collaboration(`/comments/${comment.body.id}/revisions`, 'outsider');
    const second = await collaboration(
      `/comments/${comment.body.id}/revisions?page=${first.body.nextPage}`,
      'outsider'
    );
    expect(first.status).toBe(200);
    expect(first.body.revisions).toHaveLength(20);
    expect(first.body.revisions[0].changes).toEqual([
      { field: 'markdown', before: 'Version 22', after: 'Version 23' }
    ]);
    expect(second.body.revisions).toHaveLength(4);
    expect(second.body.nextPage).toBeNull();
    expect(
      new Set(
        [...first.body.revisions, ...second.body.revisions].map((revision: any) => revision.id)
      ).size
    ).toBe(24);
    expect(second.body.revisions.at(-1).kind).toBe('created');
    const liveItems = (await collaboration(`/boards/${boardId}/items`, 'leader')).body;
    const moved = await collaboration(`/boards/${boardId}/order`, 'leader', 'PUT', {
      column: 'progress',
      move: { id: task.id, fromColumn: 'todo' },
      items: [...liveItems.filter((item: any) => item.column === 'progress'), edited.body].map(
        (item: any) => ({ id: item.id, version: item.version })
      )
    });
    expect(moved.status).toBe(200);
    const movedHistory = await collaboration(`/items/${task.id}/revisions`, 'outsider');
    expect(movedHistory.body.revisions[0]).toMatchObject({
      kind: 'moved',
      changes: [{ field: 'column', before: 'todo', after: 'progress' }]
    });
    expect(JSON.stringify(movedHistory.body)).not.toContain('itemIds');
    const activity = await collaboration(`/items/${task.id}/activity`, 'outsider');
    expect(activity.status).toBe(200);
    expect(activity.body[0]).toMatchObject({
      action: 'kanban.reordered',
      metadata: { changes: movedHistory.body.revisions[0].changes }
    });
    expect(activity.body.some((entry: any) => entry.action === 'kanban.comment.created')).toBe(
      false
    );
    expect(JSON.stringify(activity.body)).not.toContain('itemIds');

    // Older records remain visible without inventing values that were never stored.
    const [legacy] = await db
      .insert(auditEvents)
      .values({
        actorId: ids.leader,
        projectId,
        targetId: comment.body.id,
        action: 'comments.edited',
        metadata: { token: 'never-return-this-secret' }
      })
      .returning();
    try {
      const older = await collaboration(`/comments/${comment.body.id}/revisions`, 'outsider');
      expect(JSON.stringify(older.body)).not.toContain('never-return-this-secret');
      expect(
        older.body.revisions.find((revision: any) => revision.id === legacy!.id).changes
      ).toBeNull();
    } finally {
      await db.delete(auditEvents).where(eq(auditEvents.id, legacy!.id));
    }
    expect((await collaboration(`/comments/${comment.body.id}`, 'leader', 'DELETE')).status).toBe(
      200
    );
    expect((await collaboration(`/comments/${comment.body.id}/revisions`, 'outsider')).status).toBe(
      404
    );
    expect(
      (
        await collaboration(`/items/${task.id}/archive`, 'leader', 'POST', {
          version: moved.body.find((item: any) => item.id === task.id).version
        })
      ).status
    ).toBe(200);
    expect((await collaboration(`/items/${task.id}/revisions`, 'outsider')).status).toBe(403);
    expect((await collaboration(`/items/${task.id}/activity`, 'outsider')).status).toBe(403);
    const deletedActivity = await collaboration(`/items/${task.id}/activity`, 'leader');
    expect(deletedActivity.status).toBe(200);
    expect(deletedActivity.body[0].action).toBe('kanban.archived');

    expect((await collaboration(`/items/${task.id}/revisions`, 'leader')).status).toBe(200);
  });
  test('task timeline paginates safely and shares filtered diffs with the revision popup', async () => {
    const created = await collaboration(`/boards/${boardId}/items`, 'member', 'POST', {
      title: 'Timeline fixture',
      markdown: 'Initial text',
      labels: [],
      column: 'todo',
      position: 100
    });
    expect(created.status).toBe(200);
    let version = created.body.version;
    for (let index = 1; index <= 23; index++) {
      const updated = await collaboration(`/items/${created.body.id}`, 'member', 'PATCH', {
        version,
        markdown: `Update ${index}`
      });
      expect(updated.status).toBe(200);
      version = updated.body.version;
    }
    const first = await collaboration(`/items/${created.body.id}/activity`, 'outsider');
    const next = await collaboration(`/items/${created.body.id}/activity?page=1`, 'outsider');
    expect(first.status).toBe(200);
    expect(first.body).toHaveLength(20);
    expect(next.body).toHaveLength(4);
    expect(first.body[0].metadata.changes).toEqual([
      { field: 'markdown', before: 'Update 22', after: 'Update 23' }
    ]);
    expect(next.body.at(-1).action).toBe('kanban.created');
    expect(new Set([...first.body, ...next.body].map((entry: any) => entry.id)).size).toBe(24);
    expect(
      (await collaboration(`/items/${created.body.id}/activity?page=2`, 'outsider')).body
    ).toEqual([]);
    expect(
      (await collaboration(`/items/${created.body.id}/activity?page=-1`, 'outsider')).status
    ).toBe(422);
    const revisions = await collaboration(`/items/${created.body.id}/revisions`, 'outsider');
    expect(first.body.map((entry: any) => entry.metadata.changes)).toEqual(
      revisions.body.revisions.map((entry: any) => entry.changes)
    );
    const [legacy] = await db
      .insert(auditEvents)
      .values({
        actorId: ids.member,
        projectId,
        targetId: created.body.id,
        action: 'kanban.updated',
        metadata: {
          token: 'hidden-timeline-secret',
          changes: [
            { field: 'nickname', before: null, after: '' },
            { field: 'markdown', before: null, after: '' },
            { field: 'title', before: 'First', after: 'Second' },
            { field: 'password', before: 'secret', after: 'hidden-timeline-secret' }
          ]
        }
      })
      .returning();
    try {
      const activity = await collaboration(`/items/${created.body.id}/activity`, 'outsider');
      expect(activity.body.find((entry: any) => entry.id === legacy!.id).metadata).toEqual({
        changes: [{ field: 'title', before: 'First', after: 'Second' }]
      });
      expect(JSON.stringify(activity.body)).not.toContain('hidden-timeline-secret');
    } finally {
      await db.delete(auditEvents).where(eq(auditEvents.id, legacy!.id));
    }
  });
  test('forum comment history follows current thread visibility, invitations and archives', async () => {
    const thread = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Private revision thread',
      markdown: 'First post',
      visibility: 'leaders',
      invitedIds: [ids.member]
    });
    expect(thread.status).toBe(200);
    const comment = await collaboration(`/threads/${thread.body.id}/comments`, 'member', 'POST', {
      markdown: 'Original forum reply'
    });
    expect(comment.status).toBe(200);
    expect(
      (
        await collaboration(`/comments/${comment.body.id}`, 'member', 'PATCH', {
          markdown: 'Revised forum reply'
        })
      ).status
    ).toBe(200);
    expect((await collaboration(`/comments/${comment.body.id}/revisions`, 'outsider')).status).toBe(
      404
    );
    const history = await collaboration(`/comments/${comment.body.id}/revisions`, 'member');
    expect(history.status).toBe(200);
    expect(history.body.revisions[0].changes).toEqual([
      { field: 'markdown', before: 'Original forum reply', after: 'Revised forum reply' }
    ]);
    const access = await collaboration(`/threads/${thread.body.id}/access`, 'leader', 'PUT', {
      version: thread.body.version,
      visibility: 'leaders',
      invitedIds: []
    });
    expect(access.status).toBe(200);
    expect((await collaboration(`/comments/${comment.body.id}/revisions`, 'member')).status).toBe(
      404
    );
    expect(
      (
        await collaboration(`/threads/${thread.body.id}/archive`, 'leader', 'POST', {
          version: access.body.version,
          archived: true
        })
      ).status
    ).toBe(200);
    expect((await collaboration(`/comments/${comment.body.id}/revisions`, 'leader')).status).toBe(
      200
    );
  });
  test('thread activity is scoped to the thread and follows its current access rules', async () => {
    const thread = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Timeline thread',
      markdown: 'Opening post',
      visibility: 'members',
      invitedIds: []
    });
    expect(thread.status).toBe(200);
    const comment = await collaboration(`/threads/${thread.body.id}/comments`, 'member', 'POST', {
      markdown: 'Timeline reply'
    });
    expect(comment.status).toBe(200);
    expect(
      (
        await collaboration(`/comments/${comment.body.id}`, 'member', 'PATCH', {
          markdown: 'Timeline reply edited'
        })
      ).status
    ).toBe(200);
    expect((await collaboration(`/threads/${thread.body.id}/activity`, 'outsider')).status).toBe(
      404
    );
    const access = await collaboration(`/threads/${thread.body.id}/access`, 'leader', 'PUT', {
      version: thread.body.version,
      visibility: 'leaders',
      invitedIds: [ids.member]
    });
    expect(access.status).toBe(200);
    const activity = await collaboration(`/threads/${thread.body.id}/activity`, 'member');
    expect(activity.status).toBe(200);
    expect(activity.body[0]).toMatchObject({
      action: 'threads.access.updated',
      metadata: {
        changes: [
          { field: 'visibility', before: 'members', after: 'leaders' },
          { field: 'invitedIds', before: [], after: [ids.member] }
        ]
      }
    });
    expect(activity.body.some((event: any) => event.action === 'comments.edited')).toBe(false);
    const detail = await collaboration(`/threads/${thread.body.id}`, 'member');
    expect(detail.body.comments.find((entry: any) => entry.id === comment.body.id).edited).toBe(
      true
    );
    expect((await collaboration(`/threads/${thread.body.id}/activity`, 'outsider')).status).toBe(
      404
    );

    const other = await collaboration('/threads', 'leader', 'POST', {
      projectId,
      title: 'Unrelated timeline thread',
      markdown: 'Other post',
      visibility: 'members',
      invitedIds: []
    });
    const otherComment = await collaboration(
      `/threads/${other.body.id}/comments`,
      'member',
      'POST',
      { markdown: 'Other reply' }
    );
    await collaboration(`/comments/${otherComment.body.id}`, 'member', 'PATCH', {
      markdown: 'Other reply edited'
    });
    const scoped = await collaboration(`/threads/${thread.body.id}/activity`, 'member');
    expect(scoped.body.some((event: any) => event.targetId === otherComment.body.id)).toBe(false);

    const archived = await collaboration(`/threads/${thread.body.id}/archive`, 'leader', 'POST', {
      version: access.body.version,
      archived: true
    });
    expect(archived.status).toBe(200);
    const afterArchive = await collaboration(`/threads/${thread.body.id}/activity`, 'member');
    expect(afterArchive.body[0].action).toBe('threads.archived');
    expect(
      (await collaboration(`/threads/${thread.body.id}/activity?page=-1`, 'member')).status
    ).toBe(422);
  });
  test('scope denial blocks unrelated publishing and audit history', async () => {
    expect((await content(`/articles/${articleId}`, 'outsider')).status).toBe(403);
    expect((await collaboration(`/events?projectId=${projectId}`, 'member')).status).toBe(403);
    const history = await collaboration(`/events?projectId=${projectId}`, 'leader');
    expect(history.status).toBe(200);
    expect(history.body.length).toBeGreaterThan(5);
  });
  test('all exercised content mutations carry a structured change payload', async () => {
    const events = await db
      .select()
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, Object.values(ids)));
    expect(events.length).toBeGreaterThan(30);
    for (const event of events) {
      expect(
        Array.isArray(event.metadata.changes),
        `${event.action} (${event.id}) has no diff`
      ).toBe(true);
      for (const change of event.metadata.changes as any[]) {
        expect(typeof change.field).toBe('string');
        expect(Object.hasOwn(change, 'before')).toBe(true);
        expect(Object.hasOwn(change, 'after')).toBe(true);
      }
    }
  });
});
