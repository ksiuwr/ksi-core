import { getUrls, type RuntimeEnvironment } from './index';
import { randomBytes, createHash } from 'node:crypto';
export const sessionCookie = (env: RuntimeEnvironment) =>
  env.NODE_ENV === 'production' ? '__Host-ksi-session' : 'ksi-session';
export interface ProxyEvent {
  request: Request;
  url: URL;
  cookies: {
    get(name: string): string | undefined;
    set(
      name: string,
      value: string,
      opts: {
        path: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'lax';
        maxAge?: number;
        expires?: Date;
      }
    ): void;
    delete(name: string, opts: { path: string }): void;
  };
}
export async function proxy(
  event: ProxyEvent,
  env: RuntimeEnvironment,
  role: 'web' | 'auth' | 'dashboard'
): Promise<Response> {
  const urls = getUrls(env),
    expected = role === 'web' ? urls.frontend.landing : urls.frontend[role];
  if (event.url.origin !== expected || !env.PROXY_SECRET)
    return new Response('Invalid proxy configuration', { status: 503 });
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
    event.request.headers.get('origin') !== expected
  )
    return new Response('Invalid request origin', { status: 403 });
  const path = event.url.pathname.replace(/^\/api/, '');
  if (path.startsWith('/auth/') && role !== 'auth')
    return new Response('Auth origin required', { status: 403 });
  if (path.startsWith('/sso/redeem')) return new Response('Server-only endpoint', { status: 403 });
  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'origin']) {
    const value = event.request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('x-ksi-proxy-key', env.PROXY_SECRET);
  headers.set('x-ksi-origin', expected);
  const token = event.cookies.get(sessionCookie(env));
  if (token) headers.set('x-ksi-session', token);
  if (role === 'auth') headers.set('cookie', event.request.headers.get('cookie') ?? '');
  const target = path.startsWith('/auth/') ? `/api${path}` : path;
  const upstream = await fetch(`${urls.internalBackend}${target}${event.url.search}`, {
    method: event.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(event.request.method)
      ? undefined
      : await event.request.arrayBuffer(),
    redirect: 'manual'
  });
  const responseHeaders = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'application/json',
    'cache-control': 'no-store'
  });
  if (role === 'auth')
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append('set-cookie', cookie);
  const location = upstream.headers.get('location');
  if (location) responseHeaders.set('location', location);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
export async function backendFetch(
  event: ProxyEvent,
  env: RuntimeEnvironment,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const urls = getUrls(env);
  const headers = new Headers(options.headers);
  headers.set('x-ksi-proxy-key', env.PROXY_SECRET ?? '');
  headers.set('x-ksi-origin', event.url.origin);
  const token = event.cookies.get(sessionCookie(env));
  if (token) headers.set('x-ksi-session', token);
  return fetch(`${urls.internalBackend}${path}`, { ...options, headers });
}
// Resolve like a browser does, so tabs, newlines or backslashes cannot turn a path into another host.
function sameOriginPath(returnTo: string, origin: string): string {
  if (!returnTo.startsWith('/') || !URL.canParse(returnTo, origin)) return '/';
  const url = new URL(returnTo, origin);
  return url.origin === origin ? url.pathname + url.search + url.hash : '/';
}
export function startSso(
  event: ProxyEvent,
  env: RuntimeEnvironment,
  returnTo: string,
  silent = false
): string {
  const urls = getUrls(env);
  const verifier = randomBytes(32).toString('base64url'),
    state = randomBytes(32).toString('base64url');
  const safeReturn = sameOriginPath(returnTo, event.url.origin);
  event.cookies.set('ksi-sso-flow', JSON.stringify({ verifier, state, returnTo: safeReturn }), {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 120
  });
  const target = new URL('/sso', urls.frontend.auth);
  target.searchParams.set('destination', `${event.url.origin}/sso/callback`);
  target.searchParams.set('state', state);
  target.searchParams.set('challenge', createHash('sha256').update(verifier).digest('base64url'));
  if (silent) target.searchParams.set('prompt', 'none');
  return target.href;
}
export async function finishSso(event: ProxyEvent, env: RuntimeEnvironment): Promise<string> {
  let flow: { verifier: string; state: string; returnTo: string };
  try {
    flow = JSON.parse(event.cookies.get('ksi-sso-flow') ?? '');
  } catch {
    throw new Error('Login expired');
  }
  event.cookies.delete('ksi-sso-flow', { path: '/' });
  if (flow.state !== event.url.searchParams.get('state')) throw new Error('Invalid login state');
  if (event.url.searchParams.get('guest') === 'true') {
    event.cookies.set('ksi-sso-probed', '1', {
      path: '/',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60
    });
    return sameOriginPath(flow.returnTo, event.url.origin);
  }
  const response = await backendFetch(event, env, '/sso/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: event.url.searchParams.get('code'),
      state: flow.state,
      verifier: flow.verifier,
      destination: `${event.url.origin}/sso/callback`
    })
  });
  if (!response.ok) throw new Error('Login expired or already used');
  const data = (await response.json()) as { token: string; expiresAt: string | number | Date };
  event.cookies.set(sessionCookie(env), data.token, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(data.expiresAt)
  });
  return sameOriginPath(flow.returnTo, event.url.origin);
}
