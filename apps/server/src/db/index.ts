import * as schema from '@ksi-core/server/db/schema';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sql';
import Elysia from 'elysia';

const relations = defineRelations(schema, (r) => ({
  accounts: {
    users: r.one.users({
      from: r.accounts.userId,
      to: r.users.id
    })
  },
  users: {
    createdAlerts: r.many.alerts({
      from: r.users.id,
      to: r.alerts.createdBy
    })
  }
}));

const createDatabase = () => drizzle(Bun.env.DATABASE_URL!, { relations });

const globalForDB = globalThis as unknown as {
  db: ReturnType<typeof createDatabase> | undefined;
};

export const db = globalForDB.db ?? createDatabase();

if (Bun.env.NODE_ENV !== 'production') globalForDB.db = db;

export const AuthorizationProvider = new Elysia({
  name: 'services:db'
}).decorate(() => ({
  db: createDatabase()
}));

export * from './schema';
