import { expect, test } from 'bun:test';
import { finishSso, proxy, startSso, type ProxyEvent } from './server';
import { clientIpHeader, clientUserAgentHeader } from './client-context';
const origin = 'http://localhost:5175';
const proxyEnv = {
  PROXY_SECRET: 'test-proxy-secret',
  PUBLIC_AUTH_ORIGIN: origin,
  PUBLIC_API_ORIGIN: 'http://localhost:3000'
};
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

test('proxy forwards browser client context to the backend', async () => {
  const browser =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  let upstream: { url: string; headers: Headers } | null = null;
  const path = '/api/auth/sign-in/email';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    upstream = { url, headers: new Headers(init?.headers) };
    return new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;
  try {
    const response = await proxy(
      {
        request: new Request(origin + path, {
          method: 'POST',
          headers: {
            origin,
            'content-type': 'application/json',
            'user-agent': browser,
            cookie: 'ksi-session=abc',
            // A client cannot smuggle its own forwarded address through the proxy.
            [clientIpHeader]: '10.0.0.1'
          },
          body: '{}'
        }),
        url: new URL(origin + path),
        getClientAddress: () => '203.0.113.7',
        cookies: {
          get: () => undefined,
          set: () => {},
          delete: () => {}
        }
      },
      proxyEnv,
      'auth'
    );
    expect(response.status).toBe(200);
  } finally {
    globalThis.fetch = originalFetch;
  }
  expect(upstream).not.toBeNull();
  const headers = upstream!.headers;
  expect(upstream!.url).toBe(`http://localhost:3000${path}`);
  expect(headers.get(clientUserAgentHeader)).toBe(browser);
  expect(headers.get(clientIpHeader)).toBe('203.0.113.7');
  expect(headers.get('x-ksi-proxy-key')).toBe(proxyEnv.PROXY_SECRET);
  expect(headers.get('x-ksi-origin')).toBe(origin);
});
