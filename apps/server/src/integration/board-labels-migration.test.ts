import { describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../db';

const disposable =
  !!process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === '/ksi_integration';

describe.skipIf(!disposable)('legacy board label migration', () => {
  test('preserves label names, task associations, order and empty defaults', async () => {
    const migration = await Bun.file(
      new URL('../../drizzle/20261024210000_board_tags_jsonb/migration.sql', import.meta.url)
    ).text();
    const renameMigration = await Bun.file(
      new URL('../../drizzle/20261024220000_board_labels/migration.sql', import.meta.url)
    ).text();
    await db.transaction(async (tx) => {
      // Shadow the real table on this connection; leave persistent data untouched.
      await tx.execute(
        sql`CREATE TEMP TABLE boards (id integer, tags text[] NOT NULL DEFAULT '{}') ON COMMIT DROP`
      );
      await tx.execute(
        sql`INSERT INTO boards VALUES (1, ARRAY['Bug', '100% ready', 'docs/api']), (2, '{}')`
      );
      await tx.execute(
        sql`CREATE TEMP TABLE kanban_items (id integer, tags text[] NOT NULL DEFAULT '{}') ON COMMIT DROP`
      );
      await tx.execute(sql`INSERT INTO kanban_items VALUES (1, ARRAY['Bug', 'docs/api'])`);
      for (const statement of `${migration}\n--> statement-breakpoint\n${renameMigration}`.split(
        '--> statement-breakpoint'
      ))
        await tx.execute(sql.raw(statement));
      await tx.execute(sql`INSERT INTO boards (id) VALUES (3)`);
      const rows = await tx.execute(sql`SELECT labels FROM boards ORDER BY id`);
      expect(rows[0]!.labels).toEqual([
        { name: 'Bug', color: '#6b7280' },
        { name: '100% ready', color: '#6b7280' },
        { name: 'docs/api', color: '#6b7280' }
      ]);
      expect(rows[1]!.labels).toEqual([]);
      expect(rows[2]!.labels).toEqual([]);
      const items = await tx.execute(sql`SELECT labels FROM kanban_items`);
      expect(items[0]!.labels).toEqual(['Bug', 'docs/api']);
    });
  });
});
