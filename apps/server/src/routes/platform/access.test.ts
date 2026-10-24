import { beforeAll, describe, expect, test } from 'bun:test';
import type { Elysia } from 'elysia';
// No database is reachable: these are HTTP authentication boundary tests, not fake persistence tests.
process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:15432/test';
process.env.BETTER_AUTH_SECRET ??= 'http-boundary-test-only-secret-with-32-characters';
let content: Elysia<any, any, any, any, any, any, any>;
let collaboration: typeof content;
beforeAll(async () => {
  content = (await import('./content')).default;
  collaboration = (await import('./collaboration')).default;
});
describe('platform HTTP authorization boundaries', () => {
  test.each([
    '/projects/missing/members',
    '/projects/missing/join-requests',
    '/articles',
    '/articles/missing'
  ])('content read %s requires authentication before DB access', async (path) => {
    const response = await content.handle(new Request(`http://localhost/platform${path}`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'AUTH_REQUIRED' });
  });
  test('project creation cannot be called anonymously', async () => {
    const response = await content.handle(
      new Request('http://localhost/platform/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'krasnal',
          name: 'Krasnal',
          tags: [],
          fields: ['research'],
          leaderIds: ['anna']
        })
      })
    );
    expect(response.status).toBe(401);
  });
  test.each([
    '/boards',
    '/boards/missing/items',
    '/threads',
    '/threads/missing',
    '/items/missing/comments',
    '/items/missing/revisions',
    '/items/missing/activity',
    '/comments/missing/revisions',
    '/events'
  ])('collaboration read %s requires authentication before DB access', async (path) => {
    const response = await collaboration.handle(new Request(`http://localhost/platform${path}`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'AUTH_REQUIRED' });
  });
  test.each([
    ['POST', '/boards/missing/labels', { name: 'Bug' }],
    ['PATCH', '/boards/missing/labels/Bug', { name: 'Defect' }],
    ['DELETE', '/boards/missing/labels/Bug', undefined],
    ['PUT', '/boards/missing/labels', { labels: [{ name: 'Bug' }] }]
  ] as const)('label management %s requires authentication', async (method, path, body) => {
    const response = await collaboration.handle(
      new Request(`http://localhost/platform${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
      })
    );
    expect(response.status).toBe(401);
  });
  test('thread creation cannot be called anonymously', async () => {
    const response = await collaboration.handle(
      new Request('http://localhost/platform/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Discussion',
          markdown: 'Hello',
          visibility: 'association',
          invitedIds: []
        })
      })
    );
    expect(response.status).toBe(401);
  });
  test('Markdown previews cannot be rendered anonymously', async () => {
    const { app } = await import('../../app');
    const response = await app.handle(
      new Request('http://localhost/markdown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ markdown: 'Hello' })
      })
    );
    expect(response.status).toBe(401);
  });
});
