import { app } from './app';
import { consumeTicket, websocket, startRealtime, type SocketData } from './lib/realtime';
import { rejectExampleSecrets } from './lib/example-secrets';

const required = ['DATABASE_URL', 'PROXY_SECRET', 'BETTER_AUTH_SECRET'];
for (const envVar of required) {
  if (!Bun.env[envVar]) throw new Error(`Missing required environment variable: ${envVar}`);
}
rejectExampleSecrets(['PROXY_SECRET', 'BETTER_AUTH_SECRET']);

const port = Number(Bun.env.PORT ?? 3000);
const server = Bun.serve<SocketData>({
  port,
  hostname: '0.0.0.0',
  fetch: async (request, server) => {
    if (new URL(request.url).pathname === '/events') {
      const data = await consumeTicket(request);
      if (!data) return new Response('Forbidden', { status: 403 });
      if (server.upgrade(request, { data })) return;
      return new Response('Upgrade required', { status: 426 });
    }
    return app.handle(request);
  },
  websocket
});
const stopRealtime = await startRealtime();
const stop = async () => {
  await stopRealtime();
  await server.stop();
  process.exit(0);
};
process.on('SIGTERM', () => {
  void stop();
});
process.on('SIGINT', () => {
  void stop();
});
export type { App } from './app';
