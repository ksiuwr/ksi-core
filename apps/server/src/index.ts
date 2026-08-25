import { auth } from '@ksi-core/server/lib/auth';
import { discordBot } from '@ksi-core/server/lib/discord';
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

const app = new Elysia()
  // .use(
  //   cors({
  //     origin: (c) => {
  //       const origin = c.headers.get('origin');
  //       if (!origin) return false;
  //       const allowedOrigins = [getUrls().frontend.auth, getUrls().frontend.landing];
  //       return allowedOrigins.includes(origin);
  //     },
  //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //     credentials: true,
  //     allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  //   })
  // )
  // .onAfterHandle((c) => {
  //   /*
  //     Temporary workaround, [@elysia/cors is not behaving](https://github.com/elysiajs/elysia-cors/issues/67).
  //   */
  //   c.set.headers['access-control-allow-origin'] = getUrls().frontend.landing;
  // })
  .use(
    cors({
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE', 'PATCH'],
      origin: getUrls().frontend.all
    })
  )
  .all('/auth/*', betterAuthView)
  .use(routes)
  .listen(3000);

export type App = typeof app;
