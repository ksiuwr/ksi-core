import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { eq, inArray, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getUrls } from 'shared';
import { digest } from '../domain/sso';
import {
  db,
  users,
  projects,
  projectMembers,
  articles,
  articleRevisions,
  files,
  fileReferences,
  sessions,
  frontendSessions,
  auditEvents,
  outbox
} from '../db';
import { app } from '../app';
const safe =
  process.env.KSI_ENVIRONMENT === 'integration' &&
  new URL(process.env.DATABASE_URL ?? 'postgres://none@localhost/none').pathname ===
    '/ksi_integration';
const leader = createId(),
  outsider = createId(),
  projectId = createId(),
  articleId = createId(),
  fileId = createId();
const tokens = { [leader]: createId(), [outsider]: createId() };
async function request(actor: string, path: string, method = 'GET', body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-ksi-proxy-key': process.env.PROXY_SECRET!,
        'x-ksi-origin': getUrls().frontend.dashboard,
        'x-ksi-session': tokens[actor]!
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  );
  return { status: response.status, body: (await response.json()) as any };
}
describe.skipIf(!safe)('public content translations', () => {
  beforeAll(async () => {
    for (const id of [leader, outsider]) {
      await db.insert(users).values({
        id,
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        bio: 'Engineering',
        email: `${id}@example.test`,
        membershipStatus: 'active'
      });
      const sessionId = createId();
      await db.insert(sessions).values({
        id: sessionId,
        userId: id,
        token: createId(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      await db.insert(frontendSessions).values({
        id: digest(tokens[id]!),
        sessionId,
        origin: getUrls().frontend.dashboard,
        environment: 'integration',
        expiresAt: new Date(Date.now() + 3600000)
      });
    }
    await db.insert(projects).values({
      id: projectId,
      slug: projectId,
      name: 'Robotics',
      description: 'Robots',
      tags: ['engineering']
    });
    await db.insert(projectMembers).values({ projectId, userId: leader, leader: true });
    await db.insert(articles).values({
      id: articleId,
      projectId,
      slug: articleId,
      title: 'Project guide',
      markdown: 'English guide',
      createdBy: leader,
      state: 'published',
      mainArticle: true
    });
    await db.insert(files).values({
      id: fileId,
      hash: fileId,
      objectKey: fileId,
      filename: 'translation.webp',
      mime: 'image/webp',
      size: 100,
      environment: 'integration',
      uploaderId: leader,
      state: 'private'
    });
  });
  afterAll(async () => {
    await db.delete(fileReferences).where(eq(fileReferences.fileId, fileId));
    await db.delete(files).where(eq(files.id, fileId));
    await db.delete(articleRevisions).where(eq(articleRevisions.articleId, articleId));
    await db.delete(articles).where(eq(articles.id, articleId));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    const events = await db
      .select()
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, [leader, outsider]));
    if (events.length)
      await db.delete(outbox).where(
        inArray(
          outbox.eventId,
          events.map((event) => event.id)
        )
      );
    await db.delete(auditEvents).where(inArray(auditEvents.actorId, [leader, outsider]));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(users).where(inArray(users.id, [leader, outsider]));
  });
  test('leaders translate public projects with conflict checks and English fallback', async () => {
    const path = `/platform/translations/project/${projectId}/pl`;
    expect(
      (await request(outsider, path, 'PUT', { version: 1, fields: { name: 'Robotyka' } })).status
    ).toBe(403);
    expect(
      (
        await request(leader, path.replace(/\/pl$/, '/fr'), 'PUT', {
          version: 1,
          fields: { name: 'Robotique' }
        })
      ).status
    ).toBe(422);
    expect(
      (
        await request(leader, path, 'PUT', {
          version: 1,
          fields: { name: 'Robotyka', tags: ['inżynieria'] }
        })
      ).status
    ).toBe(200);
    expect(
      (await request(leader, path, 'PUT', { version: 1, fields: { name: 'Stale' } })).status
    ).toBe(409);
    const page = await request(outsider, `/platform/public/projects/${projectId}?locale=pl`);
    expect(page.body).toMatchObject({
      name: 'Robotyka',
      description: 'Robots',
      tags: ['inżynieria']
    });
    expect(
      (await request(leader, `/platform/public/projects/${projectId}?locale=en-us`)).body.name
    ).toBe('Robotics');
  });
  test('profile translations retain privacy and cannot mutate protected account fields', async () => {
    const path = `/platform/translations/profile/${leader}/pl`;
    expect((await request(outsider, path, 'PUT', { fields: { firstName: 'Jan' } })).status).toBe(
      403
    );
    expect(
      (await request(leader, path, 'PUT', { fields: { email: 'attack@example.test' } })).status
    ).toBe(422);
    expect(
      (
        await request(leader, path, 'PUT', {
          fields: { firstName: 'Jan', lastName: 'Kowalski', bio: 'Inżynieria' }
        })
      ).status
    ).toBe(200);
    const publicMember = (await request(outsider, `/platform/public/members/${leader}?locale=pl`))
      .body;
    expect(publicMember).toMatchObject({ name: 'Jan K.', bio: 'Inżynieria' });
    expect(publicMember).not.toHaveProperty('email');
    expect(publicMember).not.toHaveProperty('translations');
    expect((await request(leader, '/users/me')).body.user.firstName).toBe('John');
  });
  test('article translations keep revision and file references through ordinary publishing', async () => {
    const path = `/platform/translations/article/${articleId}/pl`;
    expect(
      (await request(outsider, path, 'PUT', { version: 1, fields: { title: 'Poradnik' } })).status
    ).toBe(403);
    const translated = await request(leader, path, 'PUT', {
      version: 1,
      fields: { title: 'Poradnik', markdown: `Polski tekst ![Ilustracja](file:${fileId})` }
    });
    expect(translated.status).toBe(200);
    const [revision] = await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, articleId));
    expect(revision!.translations.pl!.title).toBe('Poradnik');
    const saved = await request(leader, `/platform/articles/${articleId}`, 'PUT', {
      version: 2,
      title: 'Project guide',
      markdown: 'Updated English',
      state: 'published',
      mainArticle: true,
      projectFeed: false,
      websiteFeed: false
    });
    expect(saved.status).toBe(200);
    expect(
      await db
        .select()
        .from(fileReferences)
        .where(and(eq(fileReferences.fileId, fileId), eq(fileReferences.ownerType, 'article')))
    ).toHaveLength(1);
    expect(
      (await request(outsider, `/platform/public/articles/${articleId}?locale=pl`)).body.title
    ).toBe('Poradnik');
    expect((await request(leader, path, 'PUT', { version: 3, fields: {} })).status).toBe(200);
    expect(
      (await request(outsider, `/platform/public/articles/${articleId}?locale=pl`)).body.title
    ).toBe('Project guide');
    // Historical translations keep their attachment alive after removal from the current article.
    expect(
      (await db.select().from(fileReferences).where(eq(fileReferences.fileId, fileId))).some(
        (ref) => ref.ownerType === 'revision'
      )
    ).toBe(true);
  });
  test('translation events retain changed content and the edited locale', async () => {
    const events = await db.select().from(auditEvents).where(eq(auditEvents.actorId, leader));
    for (const [action, expected] of [
      ['projects.translation.updated', { field: 'name', before: null, after: 'Robotyka' }],
      ['articles.translation.updated', { field: 'title', before: null, after: 'Poradnik' }]
    ] as const) {
      const matching = events.filter((record) => record.action === action);
      expect(matching.length).toBeGreaterThan(0);
      expect(matching.every((event) => event.metadata.locale === 'pl')).toBe(true);
      expect(matching.flatMap((event) => event.metadata.changes)).toContainEqual(expected);
    }
  });
});
