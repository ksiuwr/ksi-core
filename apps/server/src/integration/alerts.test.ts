import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createId } from '@paralleldrive/cuid2';
import { eq, inArray } from 'drizzle-orm';
import { getUrls } from 'shared';
import { app } from '../app';
import { alerts, auditEvents, db, frontendSessions, outbox, sessions, users } from '../db';
import { digest } from '../domain/sso';

const safe =
  process.env.KSI_ENVIRONMENT === 'integration' &&
  new URL(process.env.DATABASE_URL ?? 'postgres://none@localhost/none').pathname ===
    '/ksi_integration';
const roles = ['administrator', 'board', 'member', 'denied', 'pending'] as const;
type Actor = (typeof roles)[number];
const ids = Object.fromEntries(roles.map((role) => [role, createId()])) as Record<Actor, string>;
const tokens = Object.fromEntries(roles.map((role) => [role, createId()])) as Record<Actor, string>;
const created: string[] = [];
const path = '/dashboard/admin/alerts';
const body = {
  title: 'Scheduled announcement',
  description: 'Details',
  color: 'info',
  link: '/projects',
  startDate: new Date(Date.now() - 3600000).toISOString(),
  endDate: new Date(Date.now() + 3600000).toISOString(),
  priority: 999
};
async function request(actor: Actor | null, route: string, method = 'GET', data?: unknown) {
  return app.handle(
    new Request(`http://localhost:3000${route}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-ksi-proxy-key': process.env.PROXY_SECRET!,
        'x-ksi-origin': getUrls().frontend.dashboard,
        ...(actor ? { 'x-ksi-session': tokens[actor] } : {})
      },
      body: data === undefined ? undefined : JSON.stringify(data)
    })
  );
}
async function create(actor: Actor, overrides = {}) {
  const title = createId();
  expect((await request(actor, path, 'POST', { ...body, ...overrides, title })).status).toBe(200);
  const [row] = await db.select().from(alerts).where(eq(alerts.title, title));
  created.push(row!.id);
  return row!;
}

describe.skipIf(!safe)('association alert scheduling and permissions', () => {
  beforeAll(async () => {
    for (const actor of roles) {
      await db.insert(users).values({
        id: ids[actor],
        name: actor,
        email: `${ids[actor]}@example.test`,
        role: actor === 'denied' || actor === 'pending' ? 'board' : actor,
        flags: actor === 'denied' ? ['-association.alerts.*'] : [],
        membershipStatus: actor === 'pending' ? 'pending' : 'active'
      });
      const sessionId = createId();
      const expiresAt = new Date(Date.now() + 3600000);
      await db.insert(sessions).values({
        id: sessionId,
        userId: ids[actor],
        token: createId(),
        expiresAt,
        updatedAt: new Date()
      });
      await db.insert(frontendSessions).values({
        id: digest(tokens[actor]),
        sessionId,
        origin: getUrls().frontend.dashboard,
        environment: 'integration',
        expiresAt
      });
    }
  });
  afterAll(async () => {
    if (created.length) await db.delete(alerts).where(inArray(alerts.id, created));
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(inArray(auditEvents.actorId, Object.values(ids)));
    if (events.length)
      await db.delete(outbox).where(
        inArray(
          outbox.eventId,
          events.map((e) => e.id)
        )
      );
    await db.delete(auditEvents).where(inArray(auditEvents.actorId, Object.values(ids)));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });
  test('anonymous, ordinary, denied and pending users cannot read or mutate alerts', async () => {
    for (const actor of [null, 'member', 'denied', 'pending'] as const) {
      const expected = actor === null ? 401 : 403;
      for (const [method, route, data] of [
        ['GET', `${path}?page=0`, undefined],
        ['POST', path, body],
        ['PUT', `${path}/missing`, body],
        ['DELETE', `${path}/missing`, undefined]
      ] as const)
        expect((await request(actor, route, method, data)).status).toBe(expected);
    }
  });
  test('administrators and board can create, edit, list and delete an alert', async () => {
    for (const actor of ['administrator', 'board'] as const) {
      const row = await create(actor);
      expect((await request(actor, `${path}?page=0`)).status).toBe(200);
      expect(
        (
          await request(actor, `${path}/${row.id}`, 'PUT', {
            ...body,
            title: row.title,
            color: 'warning',
            link: ''
          })
        ).status
      ).toBe(200);
      const [saved] = await db.select().from(alerts).where(eq(alerts.id, row.id));
      expect(saved!.color).toBe('warning');
      expect(saved!.link).toBe('');
      expect((await request(actor, `${path}/${row.id}`, 'DELETE')).status).toBe(200);
    }
  });
  test('rejects reversed/equal intervals, invalid dates, blank titles and unsafe links', async () => {
    const row = await create('board');
    for (const invalid of [
      { endDate: body.startDate },
      { startDate: body.endDate, endDate: body.startDate },
      { startDate: 'not-a-date' },
      { title: '   ' },
      { link: 'javascript:alert(1)' },
      { color: 'pink' }
    ]) {
      for (const [route, method] of [
        [path, 'POST'],
        [`${path}/${row.id}`, 'PUT']
      ]) {
        expect(
          (await request('board', route!, method, { ...body, ...invalid })).status
        ).toBeGreaterThanOrEqual(400);
      }
    }
    for (const page of ['-1', '0.5'])
      expect((await request('board', `${path}?page=${page}`)).status).toBe(422);
  });
  test('public selection excludes future/expired alerts and resolves overlapping priorities', async () => {
    const low = await create('board', { priority: 1000000 });
    const high = await create('board', { priority: 1000001, color: 'danger' });
    await create('board', {
      priority: 1000002,
      startDate: new Date(Date.now() + 3600000).toISOString(),
      endDate: new Date(Date.now() + 7200000).toISOString()
    });
    await create('board', {
      priority: 1000002,
      startDate: new Date(Date.now() - 7200000).toISOString(),
      endDate: new Date(Date.now() - 3600000).toISOString()
    });
    expect(((await (await request(null, '/alerts/current')).json()) as { id: string }).id).toBe(
      high.id
    );
    await db.delete(alerts).where(eq(alerts.id, high.id));
    const latest = await create('board', {
      priority: 1000000,
      startDate: new Date(Date.now() - 1800000).toISOString()
    });
    expect(((await (await request(null, '/alerts/current')).json()) as { id: string }).id).toBe(
      latest.id
    );
    await db.delete(alerts).where(eq(alerts.id, latest.id));
    expect(((await (await request(null, '/alerts/current')).json()) as { id: string }).id).toBe(
      low.id
    );
  });
  test('alerts reuse the translation permissions, locale, field and English-source rules', async () => {
    const row = await create('board');
    const route = `/platform/translations/alert/${row.id}/pl`;
    const translation = { version: 1, fields: { title: 'Ogłoszenie' } };
    for (const actor of [null, 'member', 'denied', 'pending'] as const)
      expect((await request(actor, route, 'PUT', translation)).status).toBe(
        actor === null ? 401 : 403
      );
    for (const locale of ['en', 'de'])
      expect(
        (
          await request(
            'board',
            `/platform/translations/alert/${row.id}/${locale}`,
            'PUT',
            translation
          )
        ).status
      ).toBe(422);
    for (const fields of [
      { color: 'danger' },
      { title: ['invalid'] },
      { title: 'x'.repeat(201) },
      { description: 'x'.repeat(2001) },
      { link: 'javascript:alert(1)' },
      { link: 'data:text/html,test' },
      { link: 'x'.repeat(2001) }
    ])
      expect((await request('board', route, 'PUT', { version: 1, fields })).status).toBe(422);
    expect((await request('board', route, 'PUT', translation)).status).toBe(200);
    expect((await request('board', route, 'PUT', translation)).status).toBe(409);
    expect(
      (await request('board', `${path}/${row.id}`, 'PUT', { ...body, version: 1 })).status
    ).toBe(409);
    const empty = await create('board', { description: '', link: '' });
    for (const fields of [{ description: 'Opis' }, { link: '/projekty' }])
      expect(
        (
          await request('board', `/platform/translations/alert/${empty.id}/pl`, 'PUT', {
            version: 1,
            fields
          })
        ).status
      ).toBe(422);
  });
  test('public banners localize title, content and link, and fall back to English per field', async () => {
    const row = await create('administrator', { priority: 2000000 });
    const route = `/platform/translations/alert/${row.id}/pl`;
    const fields = { title: 'Ogłoszenie', description: 'Polska treść', link: '/projects?lang=pl' };
    const saved = await request('administrator', route, 'PUT', { version: 1, fields });
    expect(saved.status).toBe(200);
    const result = (await saved.json()) as { version: number; translations: unknown };
    expect(result.version).toBe(2);
    expect(result.translations).toEqual({ pl: fields });
    const localized = (await (await request(null, '/alerts/current?locale=pl')).json()) as Record<
      string,
      unknown
    >;
    expect(localized).toMatchObject({
      id: row.id,
      ...fields,
      color: row.color,
      startDate: row.startDate.toISOString()
    });
    for (const locale of ['en-us', 'de']) {
      const english = (await (
        await request(null, `/alerts/current?locale=${locale}`)
      ).json()) as Record<string, unknown>;
      expect(english).toMatchObject({
        title: row.title,
        description: body.description,
        link: body.link
      });
    }
    const listed = (await (await request('administrator', `${path}?page=0`)).json()) as {
      results: { id: string; title: string; translations: unknown }[];
    };
    expect(listed.results.find((alert) => alert.id === row.id)).toMatchObject({
      title: row.title,
      translations: { pl: fields }
    });
    expect(
      (await request('board', route, 'PUT', { version: 2, fields: { title: 'Tylko tytuł' } }))
        .status
    ).toBe(200);
    const partial = (await (await request(null, '/alerts/current?locale=pl')).json()) as Record<
      string,
      unknown
    >;
    expect(partial).toMatchObject({
      title: 'Tylko tytuł',
      description: body.description,
      link: body.link
    });
    expect((await request('board', route, 'PUT', { version: 3, fields: {} })).status).toBe(200);
    const removed = (await (await request(null, '/alerts/current?locale=pl')).json()) as Record<
      string,
      unknown
    >;
    expect(removed).toMatchObject({ title: row.title, translations: {}, version: 4 });
    // Without an order Postgres may return rows in any order, so `find` needs one.
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.targetId, row.id))
      .orderBy(auditEvents.createdAt, auditEvents.id);
    expect(events.filter((event) => event.action === 'alerts.translation.updated')).toHaveLength(3);
    expect(
      events.find((event) => event.action === 'alerts.translation.updated')?.metadata
    ).toMatchObject({ locale: 'pl', version: 2 });
    expect(
      (
        await request('board', `${path}/${row.id}`, 'PUT', {
          ...body,
          title: row.title,
          version: 4
        })
      ).status
    ).toBe(200);
    expect((await request('board', route, 'PUT', { version: 4, fields })).status).toBe(409);
    await db.delete(alerts).where(eq(alerts.id, row.id));
  });
});
