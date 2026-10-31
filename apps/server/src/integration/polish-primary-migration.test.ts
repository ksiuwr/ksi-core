import { describe, expect, test } from 'bun:test';
import { sql, TransactionRollbackError } from 'drizzle-orm';
import { db } from '../db';

const disposable =
  !!process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === '/ksi_integration';

const shadowTables = [
  `users (id text, first_name text NOT NULL, last_name text NOT NULL, nickname text, bio text,
    translations jsonb NOT NULL DEFAULT '{}')`,
  `alerts (id text, title text NOT NULL, description text NOT NULL, link text,
    translations jsonb NOT NULL DEFAULT '{}')`,
  `projects (id text, name text NOT NULL, description text NOT NULL, tags text[] NOT NULL,
    translations jsonb NOT NULL DEFAULT '{}')`,
  `project_links (id text, label text NOT NULL, translations jsonb NOT NULL DEFAULT '{}')`,
  `articles (id text, title text NOT NULL, markdown text NOT NULL, language text NOT NULL DEFAULT 'en',
    translations jsonb NOT NULL DEFAULT '{}')`,
  `article_revisions (id text, title text NOT NULL, markdown text NOT NULL,
    translations jsonb NOT NULL DEFAULT '{}')`,
  `doc_folders (id text, project_id text, parent_id text, name text NOT NULL,
    translations jsonb NOT NULL DEFAULT '{}', created_at timestamp NOT NULL)`,
  ...['doc_pages', 'doc_revisions', 'doc_proposals'].map(
    (table) => `${table} (id text, folder_id text, folder text NOT NULL, title text NOT NULL,
      markdown text NOT NULL, translations jsonb NOT NULL DEFAULT '{}')`
  )
];

describe.skipIf(!disposable)('Polish primary content migration', () => {
  test('moves Polish into the primary fields and keeps the English it replaced', async () => {
    const migration = await Bun.file(
      new URL('../../drizzle/20261031120000_polish_primary_content/migration.sql', import.meta.url)
    ).text();
    await db
      .transaction(async (tx) => {
        // Shadow the real tables on this connection and roll back; persistent data stays untouched.
        for (const table of shadowTables) await tx.execute(sql.raw(`CREATE TEMP TABLE ${table}`));
        await tx.execute(
          sql`CREATE UNIQUE INDEX "doc_folder_sibling_name_unique" ON doc_folders
            (coalesce(project_id, ''), coalesce(parent_id, ''), lower(name))`
        );
        await tx.execute(sql`INSERT INTO users VALUES
          ('translated', 'John', 'Smith', NULL, 'Engineering',
            '{"pl": {"firstName": "Jan", "lastName": " \\n\\t", "bio": "Inżynieria"}}'),
          ('english', 'Ann', 'Lee', NULL, NULL, '{}'),
          ('blank-source', 'Jakub', 'K', NULL, NULL, '{"pl": {"nickname": "Kuba"}}')`);
        await tx.execute(sql`INSERT INTO alerts VALUES
          ('alert', 'Notice', 'English text', NULL, '{"pl": {"title": "Ogłoszenie", "link": "/x"}}')`);
        await tx.execute(sql`INSERT INTO projects VALUES
          ('project', 'Robotics', 'Robots', ARRAY['robotics', 'ai'],
            '{"pl": {"name": "Robotyka", "tags": ["robotyka", "si"]}}'),
          ('untagged', 'Empty', '', '{}', '{"pl": {"description": "Opis", "tags": []}}')`);
        await tx.execute(sql`INSERT INTO project_links VALUES
          ('link', 'Website', '{"pl": {"label": "Strona"}}'),
          ('blank', 'Repo', '{"pl": {"label": ""}}')`);
        await tx.execute(sql`INSERT INTO articles VALUES
          ('article', 'Guide', 'English body', 'en', '{"pl": {"markdown": "Polska treść"}}')`);
        await tx.execute(sql`INSERT INTO article_revisions VALUES
          ('revision', 'Guide', 'English body', '{"pl": {"markdown": "Polska treść"}}')`);
        await tx.execute(sql`INSERT INTO doc_folders VALUES
          ('polish', NULL, NULL, 'Obóz', '{}', now() - interval '5 days'),
          ('camp', NULL, NULL, 'Camp', '{"pl": {"name": "Obóz"}}', now() - interval '4 days'),
          ('kit', NULL, 'camp', 'Kit', '{"pl": {"name": "Sprzęt"}}', now() - interval '2 days'),
          ('equipment', NULL, 'camp', 'Equipment', '{"pl": {"name": "sprzęt"}}', now() - interval '1 day'),
          ('archive', NULL, NULL, 'Archive', '{}', now())`);
        await tx.execute(sql`INSERT INTO doc_pages VALUES
          ('page', 'kit', 'Camp/Kit', 'Packing', 'Items', '{"pl": {"title": "Pakowanie"}}'),
          ('moved', 'kit', 'Old/Path', 'Moved', 'Text', '{}')`);
        await tx.execute(sql`INSERT INTO doc_revisions VALUES
          ('revision', 'kit', 'Camp/Kit', 'Packing', 'Items', '{}')`);
        await tx.execute(sql`INSERT INTO doc_proposals VALUES
          ('proposal', 'equipment', 'Camp/Equipment', 'New', 'Text', '{"pl": {"markdown": "Tekst"}}')`);

        for (const statement of migration.split('--> statement-breakpoint'))
          await tx.execute(sql.raw(statement));

        const rows = async (query: string) => [...(await tx.execute(sql.raw(query)))];
        expect(
          await rows(
            'SELECT id, first_name, last_name, nickname, bio, translations FROM users ORDER BY id'
          )
        ).toEqual([
          {
            id: 'blank-source',
            first_name: 'Jakub',
            last_name: 'K',
            nickname: 'Kuba',
            bio: null,
            translations: {}
          },
          {
            id: 'english',
            first_name: 'Ann',
            last_name: 'Lee',
            nickname: null,
            bio: null,
            translations: {}
          },
          {
            id: 'translated',
            first_name: 'Jan',
            last_name: 'Smith',
            nickname: null,
            bio: 'Inżynieria',
            translations: { en: { firstName: 'John', bio: 'Engineering' } }
          }
        ]);
        expect(await rows('SELECT title, description, link, translations FROM alerts')).toEqual([
          {
            title: 'Ogłoszenie',
            description: 'English text',
            link: '/x',
            translations: { en: { title: 'Notice' } }
          }
        ]);
        expect(
          await rows('SELECT id, name, description, tags, translations FROM projects ORDER BY id')
        ).toEqual([
          {
            id: 'project',
            name: 'Robotyka',
            description: 'Robots',
            tags: ['robotyka', 'si'],
            translations: { en: { name: 'Robotics', tags: ['robotics', 'ai'] } }
          },
          { id: 'untagged', name: 'Empty', description: 'Opis', tags: [], translations: {} }
        ]);
        expect(await rows('SELECT id, label, translations FROM project_links ORDER BY id')).toEqual(
          [
            { id: 'blank', label: 'Repo', translations: {} },
            { id: 'link', label: 'Strona', translations: { en: { label: 'Website' } } }
          ]
        );
        const article = {
          title: 'Guide',
          markdown: 'Polska treść',
          translations: { en: { markdown: 'English body' } }
        };
        expect(await rows('SELECT title, markdown, language, translations FROM articles')).toEqual([
          { ...article, language: 'pl' }
        ]);
        expect(await rows('SELECT title, markdown, translations FROM article_revisions')).toEqual([
          article
        ]);
        // An untranslated sibling keeps its name; a translated folder that would collide keeps both.
        expect(await rows('SELECT id, name, translations FROM doc_folders ORDER BY id')).toEqual([
          { id: 'archive', name: 'Archive', translations: {} },
          { id: 'camp', name: 'Obóz (Camp)', translations: { en: { name: 'Camp' } } },
          {
            id: 'equipment',
            name: 'sprzęt (Equipment)',
            translations: { en: { name: 'Equipment' } }
          },
          { id: 'kit', name: 'Sprzęt', translations: { en: { name: 'Kit' } } },
          { id: 'polish', name: 'Obóz', translations: {} }
        ]);
        expect(
          await rows('SELECT id, folder, title, translations FROM doc_pages ORDER BY id')
        ).toEqual([
          { id: 'moved', folder: 'Old/Path', title: 'Moved', translations: {} },
          {
            id: 'page',
            folder: 'Obóz (Camp)/Sprzęt',
            title: 'Pakowanie',
            translations: { en: { title: 'Packing' } }
          }
        ]);
        expect(await rows('SELECT folder, title FROM doc_revisions')).toEqual([
          { folder: 'Obóz (Camp)/Sprzęt', title: 'Packing' }
        ]);
        expect(await rows('SELECT folder, markdown, translations FROM doc_proposals')).toEqual([
          {
            folder: 'Obóz (Camp)/sprzęt (Equipment)',
            markdown: 'Tekst',
            translations: { en: { markdown: 'Text' } }
          }
        ]);
        expect(
          await rows(`SELECT 1 FROM pg_indexes WHERE schemaname LIKE 'pg_temp%'
            AND indexname = 'doc_folder_sibling_name_unique'`)
        ).toHaveLength(1);
        tx.rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof TransactionRollbackError)) throw error;
      });
  });
});
