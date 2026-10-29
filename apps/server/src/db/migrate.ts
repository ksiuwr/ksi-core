import { resolve } from 'node:path';
import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

// `drizzle-kit migrate` delegates to this same drizzle-orm migrator, so both record identical
// rows in drizzle.__drizzle_migrations and either tool recognizes the other's applied migrations.
const MIGRATION_LOCK = 842502;

export async function runMigrations(url: string) {
  // A single connection keeps the session advisory lock held for the whole migration run.
  const client = new SQL({ url, max: 1 });
  try {
    await client`select pg_advisory_lock(${MIGRATION_LOCK})`;
    await migrate(drizzle({ client }), {
      migrationsFolder: resolve(import.meta.dir, '../../drizzle')
    });
  } finally {
    // Closing the connection also releases the advisory lock.
    await client.close();
  }
}

if (import.meta.main) {
  if (!Bun.env.DATABASE_URL) throw new Error('Missing required environment variable: DATABASE_URL');
  await runMigrations(Bun.env.DATABASE_URL);
  console.log(JSON.stringify({ service: 'migrations', code: 'MIGRATIONS_APPLIED' }));
}
