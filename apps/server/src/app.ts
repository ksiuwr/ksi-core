import { translationRoutes } from './routes/platform/translations';
import { Elysia, status, t } from 'elysia';
import { renderMarkdown } from 'shared/markdown';
import { auth } from './lib/auth';
import { db } from './db';
import { sql } from 'drizzle-orm';
import routes from './routes';
import { ssoRoutes } from './routes/platform/sso';
import { approvalRoutes } from './routes/platform/approvals';
import { userRoutes } from './routes/platform/users';
import content, { active } from './routes/platform/content';
import collaboration from './routes/platform/collaboration';
import { filesRoutes } from './routes/platform/files';
import { realtimeRoutes } from './lib/realtime';
import { createElysia } from './lib/createElysia';
import { getUrls } from 'shared';
import { previewCredentialRoutes } from './routes/platform/previews';
export const app = new Elysia()
  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : '';
    const codes = [
      'LAST_ADMINISTRATOR',
      'FORBIDDEN',
      'ACCOUNT_DELETED',
      'USE_ANONYMIZATION',
      'LEADER_REASSIGNMENT_REQUIRED',
      'ACTIVE_LEADER_REQUIRED',
      'INVALID_DESTINATION',
      'REQUEST_ALREADY_REVIEWED'
    ];
    if (codes.includes(message)) {
      set.status = message === 'FORBIDDEN' ? 403 : 409;
      return { code: message };
    }
  })
  .use(
    createElysia().post(
      '/markdown',
      ({ body, user }) => {
        active(user);
        return renderMarkdown(body.markdown);
      },
      { body: t.Object({ markdown: t.String({ maxLength: 500000 }) }) }
    )
  )
  .get('/health', () => ({ status: 'ok', environment: getUrls().environment }))
  .get('/ready', async () => {
    await db.execute(sql`select 1`);
    return { status: 'ready' };
  })
  .all('/api/auth/*', ({ request }) => {
    if (
      !Bun.env.PROXY_SECRET ||
      request.headers.get('x-ksi-proxy-key') !== Bun.env.PROXY_SECRET ||
      request.headers.get('x-ksi-origin') !== getUrls().frontend.auth
    )
      throw status(403, { code: 'AUTH_PROXY_REQUIRED' });
    return auth.handler(request);
  })
  .use(ssoRoutes)
  .use(approvalRoutes)
  .use(userRoutes)
  .use(content)
  .use(translationRoutes)
  .use(collaboration)
  .use(filesRoutes)
  .use(previewCredentialRoutes)
  .use(realtimeRoutes)
  .use(routes);
export type App = typeof app;
