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
        name: 'Jan Kowalski',
        firstName: 'Jan',
        lastName: 'Kowalski',
        bio: 'Inżynieria',
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
      name: 'Robotyka',
      description: 'Roboty',
      tags: ['inżynieria']
    });
    await db.insert(projectMembers).values({ projectId, userId: leader, leader: true });
    await db.insert(articles).values({
      id: articleId,
      projectId,
      slug: articleId,
      title: 'Poradnik projektu',
      markdown: 'Polski poradnik',
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
  test('leaders translate public projects with conflict checks and Polish fallback', async () => {
    const path = `/platform/translations/project/${projectId}/en`;
    expect(
      (await request(outsider, path, 'PUT', { version: 1, fields: { name: 'Robotics' } })).status
    ).toBe(403);
    // Polish is the primary content, so only English is a translation locale.
    for (const locale of ['pl', 'fr'])
      expect(
        await request(leader, path.replace(/\/en$/, `/${locale}`), 'PUT', {
          version: 1,
          fields: { name: 'Robotique' }
        })
      ).toMatchObject({ status: 422, body: { code: 'UNSUPPORTED_TRANSLATION_LOCALE' } });
    expect(
      (
        await request(leader, path, 'PUT', {
          version: 1,
          fields: { name: 'Robotics', tags: ['engineering'] }
        })
      ).status
    ).toBe(200);
    expect(
      (await request(leader, path, 'PUT', { version: 1, fields: { name: 'Stale' } })).status
    ).toBe(409);
    const page = await request(outsider, `/platform/public/projects/${projectId}?locale=en-us`);
    expect(page.body).toMatchObject({
      name: 'Robotics',
      description: 'Roboty',
      tags: ['engineering']
    });
    for (const query of ['?locale=pl', '?locale=fr', ''])
      expect(
        (await request(leader, `/platform/public/projects/${projectId}${query}`)).body
      ).toMatchObject({ name: 'Robotyka', description: 'Roboty', tags: ['inżynieria'] });
  });
  test('profile translations retain privacy and cannot mutate protected account fields', async () => {
    const path = `/platform/translations/profile/${leader}/en`;
    expect((await request(outsider, path, 'PUT', { fields: { firstName: 'John' } })).status).toBe(
      403
    );
    expect(
      (await request(leader, path, 'PUT', { fields: { email: 'attack@example.test' } })).status
    ).toBe(422);
    expect(
      (
        await request(leader, path, 'PUT', {
          fields: { firstName: 'John', lastName: 'Smith', bio: 'Engineering' }
        })
      ).status
    ).toBe(200);
    const publicMember = (await request(outsider, `/platform/public/members/${leader}?locale=en`))
      .body;
    expect(publicMember).toMatchObject({ name: 'John S.', bio: 'Engineering' });
    expect(publicMember).not.toHaveProperty('email');
    expect(publicMember).not.toHaveProperty('translations');
    expect(
      (await request(outsider, `/platform/public/members/${leader}?locale=pl`)).body
    ).toMatchObject({ name: 'Jan K.', bio: 'Inżynieria' });
    expect((await request(leader, '/users/me')).body.user.firstName).toBe('Jan');
  });
  test('article translations keep revision and file references through ordinary publishing', async () => {
    const path = `/platform/translations/article/${articleId}/en`;
    expect(
      (await request(outsider, path, 'PUT', { version: 1, fields: { title: 'Guide' } })).status
    ).toBe(403);
    const translated = await request(leader, path, 'PUT', {
      version: 1,
      fields: { title: 'Guide', markdown: `English text ![Illustration](file:${fileId})` }
    });
    expect(translated.status).toBe(200);
    const [revision] = await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, articleId));
    expect(revision!.translations.en!.title).toBe('Guide');
    const saved = await request(leader, `/platform/articles/${articleId}`, 'PUT', {
      version: 2,
      title: 'Poradnik projektu',
      markdown: 'Zaktualizowany polski poradnik',
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
      (await request(outsider, `/platform/public/articles/${articleId}?locale=en`)).body.title
    ).toBe('Guide');
    expect((await request(leader, path, 'PUT', { version: 3, fields: {} })).status).toBe(200);
    const [removed] = await db.select().from(articles).where(eq(articles.id, articleId));
    expect(removed!.translations).not.toHaveProperty('en');
    expect(
      (await request(outsider, `/platform/public/articles/${articleId}?locale=en`)).body.title
    ).toBe('Poradnik projektu');
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
      ['projects.translation.updated', { field: 'name', before: null, after: 'Robotics' }],
      ['articles.translation.updated', { field: 'title', before: null, after: 'Guide' }]
    ] as const) {
      const matching = events.filter((record) => record.action === action);
      expect(matching.length).toBeGreaterThan(0);
      expect(matching.every((event) => event.metadata.locale === 'en')).toBe(true);
      expect(matching.flatMap((event) => event.metadata.changes)).toContainEqual(expected);
    }
  });
});
