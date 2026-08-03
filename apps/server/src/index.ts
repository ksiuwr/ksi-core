import { auth } from '@ksi-core/backend/lib/auth';
import { discordBot } from '@ksi-core/backend/lib/discord';
import routes from './routes';
import { cors } from '@elysia/cors';
import { Elysia, type Context } from 'elysia';
import { getUrls } from 'shared';

const betterAuthView = (context: Context) => {
  const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET'];
  // validate request method
  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.status(405);
  }
};

discordBot.ping();

const app = new Elysia({ prefix: '/api' })
  .use(
    cors({
      origin: (c) => {
        return c.headers.get('origin') === getUrls().FRONTEND;
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    })
  )
  .onAfterHandle((c) => {
    /*
      Temporary workaround, [@elysia/cors is not behaving](https://github.com/elysiajs/elysia-cors/issues/67).
    */
    c.set.headers['access-control-allow-origin'] = getUrls().FRONTEND;
  })
  .all('/auth/*', betterAuthView)
  .use(routes)
  .listen(3000);

export type App = typeof app;
