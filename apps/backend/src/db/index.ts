import * as schema from '@ksi-core/backend/db/schema';
import { drizzle } from 'drizzle-orm/bun-sql';
import Elysia from 'elysia';

const createDatabase = () => drizzle(Bun.env.DATABASE_URL!, {
    schema
});

const globalForDB = globalThis as unknown as {
    db: ReturnType<typeof createDatabase> | undefined
}

export const db = globalForDB.db ?? createDatabase()

if (Bun.env.NODE_ENV !== "production") globalForDB.db = db

export const AuthorizationProvider = new Elysia({
    name: "services:db",
})
    .decorate(() => ({
        db: createDatabase(),
    }))


export * from "./schema"