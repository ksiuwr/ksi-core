-- Polish becomes the primary content language and English an optional translation.
-- Every non-blank Polish translation moves into the content field it translated, and the English
-- text it replaced becomes that field's English translation. Fields without a Polish translation
-- keep their English text as the primary text instead of being left blank; they get no English
-- copy, so later edits of the primary text are not hidden behind a stale translation.
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'firstName' ~ '\S', false) AS first_name,
    coalesce(translations->'pl'->>'lastName' ~ '\S', false) AS last_name,
    coalesce(translations->'pl'->>'nickname' ~ '\S', false) AS nickname,
    coalesce(translations->'pl'->>'bio' ~ '\S', false) AS bio
  FROM users WHERE translations <> '{}'::jsonb
)
UPDATE users AS u SET
  first_name = CASE WHEN s.first_name THEN u.translations->'pl'->>'firstName' ELSE u.first_name END,
  last_name = CASE WHEN s.last_name THEN u.translations->'pl'->>'lastName' ELSE u.last_name END,
  nickname = CASE WHEN s.nickname THEN u.translations->'pl'->>'nickname' ELSE u.nickname END,
  bio = CASE WHEN s.bio THEN u.translations->'pl'->>'bio' ELSE u.bio END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'firstName', CASE WHEN s.first_name AND u.first_name ~ '\S' THEN u.first_name END,
    'lastName', CASE WHEN s.last_name AND u.last_name ~ '\S' THEN u.last_name END,
    'nickname', CASE WHEN s.nickname AND u.nickname ~ '\S' THEN u.nickname END,
    'bio', CASE WHEN s.bio AND u.bio ~ '\S' THEN u.bio END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = u.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'description' ~ '\S', false) AS description,
    coalesce(translations->'pl'->>'link' ~ '\S', false) AS link
  FROM alerts WHERE translations <> '{}'::jsonb
)
UPDATE alerts AS a SET
  title = CASE WHEN s.title THEN a.translations->'pl'->>'title' ELSE a.title END,
  description = CASE WHEN s.description THEN a.translations->'pl'->>'description' ELSE a.description END,
  link = CASE WHEN s.link THEN a.translations->'pl'->>'link' ELSE a.link END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND a.title ~ '\S' THEN a.title END,
    'description', CASE WHEN s.description AND a.description ~ '\S' THEN a.description END,
    'link', CASE WHEN s.link AND a.link ~ '\S' THEN a.link END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = a.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'name' ~ '\S', false) AS name,
    coalesce(translations->'pl'->>'description' ~ '\S', false) AS description,
    coalesce(jsonb_typeof(translations->'pl'->'tags') = 'array'
      AND jsonb_array_length(translations->'pl'->'tags') > 0, false) AS tags
  FROM projects WHERE translations <> '{}'::jsonb
)
UPDATE projects AS p SET
  name = CASE WHEN s.name THEN p.translations->'pl'->>'name' ELSE p.name END,
  description = CASE WHEN s.description THEN p.translations->'pl'->>'description' ELSE p.description END,
  tags = CASE WHEN s.tags
    THEN ARRAY(SELECT jsonb_array_elements_text(p.translations->'pl'->'tags')) ELSE p.tags END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'name', CASE WHEN s.name AND p.name ~ '\S' THEN p.name END,
    'description', CASE WHEN s.description AND p.description ~ '\S' THEN p.description END,
    'tags', CASE WHEN s.tags AND cardinality(p.tags) > 0 THEN to_jsonb(p.tags) END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = p.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id, coalesce(translations->'pl'->>'label' ~ '\S', false) AS label
  FROM project_links WHERE translations <> '{}'::jsonb
)
UPDATE project_links AS l SET
  label = CASE WHEN s.label THEN l.translations->'pl'->>'label' ELSE l.label END,
  translations = CASE WHEN s.label AND l.label ~ '\S'
    THEN jsonb_build_object('en', jsonb_build_object('label', l.label)) ELSE '{}'::jsonb END
FROM swap AS s WHERE s.id = l.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'markdown' ~ '\S', false) AS markdown
  FROM articles WHERE translations <> '{}'::jsonb
)
UPDATE articles AS a SET
  title = CASE WHEN s.title THEN a.translations->'pl'->>'title' ELSE a.title END,
  markdown = CASE WHEN s.markdown THEN a.translations->'pl'->>'markdown' ELSE a.markdown END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND a.title ~ '\S' THEN a.title END,
    'markdown', CASE WHEN s.markdown AND a.markdown ~ '\S' THEN a.markdown END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = a.id;
--> statement-breakpoint
UPDATE articles SET language = 'pl' WHERE language <> 'pl';
--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "language" SET DEFAULT 'pl';
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'markdown' ~ '\S', false) AS markdown
  FROM article_revisions WHERE translations <> '{}'::jsonb
)
UPDATE article_revisions AS r SET
  title = CASE WHEN s.title THEN r.translations->'pl'->>'title' ELSE r.title END,
  markdown = CASE WHEN s.markdown THEN r.translations->'pl'->>'markdown' ELSE r.markdown END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND r.title ~ '\S' THEN r.title END,
    'markdown', CASE WHEN s.markdown AND r.markdown ~ '\S' THEN r.markdown END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = r.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'markdown' ~ '\S', false) AS markdown
  FROM doc_pages WHERE translations <> '{}'::jsonb
)
UPDATE doc_pages AS d SET
  title = CASE WHEN s.title THEN d.translations->'pl'->>'title' ELSE d.title END,
  markdown = CASE WHEN s.markdown THEN d.translations->'pl'->>'markdown' ELSE d.markdown END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND d.title ~ '\S' THEN d.title END,
    'markdown', CASE WHEN s.markdown AND d.markdown ~ '\S' THEN d.markdown END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = d.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'markdown' ~ '\S', false) AS markdown
  FROM doc_revisions WHERE translations <> '{}'::jsonb
)
UPDATE doc_revisions AS d SET
  title = CASE WHEN s.title THEN d.translations->'pl'->>'title' ELSE d.title END,
  markdown = CASE WHEN s.markdown THEN d.translations->'pl'->>'markdown' ELSE d.markdown END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND d.title ~ '\S' THEN d.title END,
    'markdown', CASE WHEN s.markdown AND d.markdown ~ '\S' THEN d.markdown END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = d.id;
--> statement-breakpoint
WITH swap AS (
  SELECT id,
    coalesce(translations->'pl'->>'title' ~ '\S', false) AS title,
    coalesce(translations->'pl'->>'markdown' ~ '\S', false) AS markdown
  FROM doc_proposals WHERE translations <> '{}'::jsonb
)
UPDATE doc_proposals AS d SET
  title = CASE WHEN s.title THEN d.translations->'pl'->>'title' ELSE d.title END,
  markdown = CASE WHEN s.markdown THEN d.translations->'pl'->>'markdown' ELSE d.markdown END,
  translations = coalesce(nullif(jsonb_build_object('en', jsonb_strip_nulls(jsonb_build_object(
    'title', CASE WHEN s.title AND d.title ~ '\S' THEN d.title END,
    'markdown', CASE WHEN s.markdown AND d.markdown ~ '\S' THEN d.markdown END
  ))), '{"en": {}}'::jsonb), '{}'::jsonb)
FROM swap AS s WHERE s.id = d.id;
--> statement-breakpoint
-- Swapping names can transiently collide with a sibling, so uniqueness is checked once at the end.
DROP INDEX "doc_folder_sibling_name_unique";
--> statement-breakpoint
-- Distinct folders may share a Polish name inside one parent. The first keeps it; the others add
-- their English name, e.g. "Sprzęt (Kit)", so no folder or name is lost.
WITH swap AS (
  SELECT id, project_id, parent_id, created_at, name AS english,
    translations->'pl'->>'name' AS polish,
    coalesce(translations->'pl'->>'name' ~ '\S', false) AS translated
  FROM doc_folders WHERE translations <> '{}'::jsonb
), named AS (
  SELECT id, project_id, parent_id, created_at, english, translated,
    CASE WHEN translated THEN polish ELSE english END AS primary_name
  FROM swap
  UNION ALL
  SELECT id, project_id, parent_id, created_at, name, false, name
  FROM doc_folders WHERE translations = '{}'::jsonb
), ranked AS (
  SELECT *, row_number() OVER (
    PARTITION BY coalesce(project_id, ''), coalesce(parent_id, ''), lower(primary_name)
    ORDER BY translated, created_at, id
  ) AS position
  FROM named
)
UPDATE doc_folders AS f SET
  name = CASE WHEN r.position = 1 THEN r.primary_name
    ELSE r.primary_name || ' (' || r.english || ')' END,
  translations = CASE WHEN r.translated
    THEN jsonb_build_object('en', jsonb_build_object('name', r.english)) ELSE '{}'::jsonb END
FROM ranked AS r WHERE r.id = f.id AND f.translations <> '{}'::jsonb;
--> statement-breakpoint
CREATE UNIQUE INDEX "doc_folder_sibling_name_unique" ON "doc_folders"
  (coalesce("project_id", ''), coalesce("parent_id", ''), lower("name"));
--> statement-breakpoint
-- Path snapshots that matched their folder's English path now hold its Polish path. Snapshots of
-- an earlier location or name stay as recorded.
WITH RECURSIVE paths AS (
  SELECT id, name AS path, coalesce(translations->'en'->>'name', name) AS english, 1 AS depth
  FROM doc_folders WHERE parent_id IS NULL
  UNION ALL
  SELECT f.id, p.path || '/' || f.name,
    p.english || '/' || coalesce(f.translations->'en'->>'name', f.name), p.depth + 1
  FROM doc_folders AS f JOIN paths AS p ON f.parent_id = p.id
  WHERE p.depth < 100
), changed AS (
  SELECT id, path, english FROM paths WHERE path <> english
), pages AS (
  UPDATE doc_pages AS d SET folder = c.path
  FROM changed AS c WHERE d.folder_id = c.id AND d.folder = c.english
  RETURNING d.id
), revisions AS (
  UPDATE doc_revisions AS d SET folder = c.path
  FROM changed AS c WHERE d.folder_id = c.id AND d.folder = c.english
  RETURNING d.id
)
UPDATE doc_proposals AS d SET folder = c.path
FROM changed AS c WHERE d.folder_id = c.id AND d.folder = c.english;
