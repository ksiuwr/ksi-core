import { expect, test } from 'bun:test';
import { finishSso, startSso, type ProxyEvent } from './server';
const origin = 'http://localhost:5175';
async function login(returnTo: string) {
  const jar = new Map<string, string>();
  const cookies: ProxyEvent['cookies'] = {
    get: (name) => jar.get(name),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name)
  };
  const event = (path: string) => ({
    request: new Request(origin + path),
    url: new URL(origin + path),
    cookies
  });
  const state = new URL(startSso(event('/login'), {}, returnTo)).searchParams.get('state');
  return finishSso(event(`/sso/callback?state=${state}&guest=true`), {});
}
test('login keeps local return paths', async () => {
  expect(await login('/projects?tab=board#top')).toBe('/projects?tab=board#top');
});
test.each([
  '/\t/evil.example',
  '/\n/evil.example',
  '//evil.example',
  '/\\evil.example',
  'https://evil.example/',
  '//['
])('login never returns to another origin (%p)', async (returnTo) => {
  expect(await login(returnTo)).toBe('/');
});
