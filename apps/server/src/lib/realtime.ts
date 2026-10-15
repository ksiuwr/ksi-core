import { Client } from 'pg';
import { and, eq, gt } from 'drizzle-orm';
import { status } from 'elysia';
import type { ServerWebSocket } from 'bun';
import { db, frontendSessions, sessions, users } from '../db';
import { createProtectedElysia } from './createElysia';
import { digest, randomToken } from '../domain/sso';
import { getUrls } from 'shared';
const tickets = new Map<string, { sessionId: string; userId: string; expiresAt: number }>();
export interface SocketData {
  sessionId: string;
  userId: string;
}
const sockets = new Set<ServerWebSocket<SocketData>>();
export const realtimeRoutes = createProtectedElysia({ prefix: '/realtime' }).post(
  '/ticket',
  async ({ user, request }) => {
    if (
      !user ||
      user.membershipStatus !== 'active' ||
      request.headers.get('x-ksi-origin') !== getUrls().frontend.dashboard
    )
      throw status(403);
    const token = request.headers.get('x-ksi-session');
    if (!token) throw status(401);
    const [frontend] = await db
      .select()
      .from(frontendSessions)
      .where(
        and(eq(frontendSessions.id, digest(token)), gt(frontendSessions.expiresAt, new Date()))
      );
    if (!frontend) throw status(401);
    for (const [key, value] of tickets) if (value.expiresAt < Date.now()) tickets.delete(key);
    // A per-account cap keeps one member from exhausting the shared pool.
    let outstanding = 0;
    for (const value of tickets.values()) if (value.userId === user.id) outstanding++;
    if (tickets.size > 1000 || outstanding >= 20) throw status(429);
    const ticket = randomToken();
    tickets.set(digest(ticket), {
      sessionId: frontend.sessionId,
      userId: user.id,
      expiresAt: Date.now() + 30000
    });
    return { ticket };
  }
);
export async function consumeTicket(request: Request): Promise<SocketData | null> {
  if (request.headers.get('origin') !== getUrls().frontend.dashboard) return null;
  const protocol = request.headers.get('sec-websocket-protocol') ?? '';
  if (!/^ksi\.[A-Za-z0-9_-]{43}$/.test(protocol)) return null;
  const key = digest(protocol.slice(4)),
    ticket = tickets.get(key);
  tickets.delete(key);
  if (!ticket || ticket.expiresAt < Date.now()) return null;
  const [record] = await db
    .select({ id: users.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, ticket.sessionId),
        gt(sessions.expiresAt, new Date()),
        eq(users.membershipStatus, 'active')
      )
    );
  return record ? { sessionId: ticket.sessionId, userId: record.id } : null;
}
async function valid(socket: ServerWebSocket<SocketData>) {
  const [record] = await db
    .select({ id: users.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, socket.data.sessionId),
        gt(sessions.expiresAt, new Date()),
        eq(users.membershipStatus, 'active')
      )
    );
  return !!record;
}
export const websocket = {
  open(socket: ServerWebSocket<SocketData>) {
    sockets.add(socket);
    socket.send(JSON.stringify({ type: 'refresh' }));
  },
  message(socket: ServerWebSocket<SocketData>) {
    socket.close(1008, 'Server notifications only');
  },
  close(socket: ServerWebSocket<SocketData>) {
    sockets.delete(socket);
  }
};
export async function startRealtime() {
  const client = new Client({ connectionString: Bun.env.DATABASE_URL });
  await client.connect();
  await client.query('LISTEN ksi_events');
  let sequence = 0;
  const refresh = async () => {
    sequence++;
    await Promise.allSettled(
      [...sockets].map(async (socket) => {
        if (!(await valid(socket))) {
          socket.close(1008, 'Session revoked');
          return;
        }
        socket.send(JSON.stringify({ type: 'refresh', version: sequence }));
      })
    );
  };
  // No restricted entity names/content are broadcast. Clients refetch through authorized routes.
  client.on('notification', () => {
    void refresh().catch(() => {});
  });
  client.on('error', () => {
    for (const socket of sockets) socket.close(1012, 'Reconnect');
  });
  const timer = setInterval(() => {
    void refresh().catch(() => {});
  }, 30000);
  return async () => {
    clearInterval(timer);
    for (const socket of sockets) socket.close(1001);
    await client.end();
  };
}
