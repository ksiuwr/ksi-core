-- A helper is required because PostgreSQL disallows subqueries in ALTER COLUMN USING.
CREATE FUNCTION pg_temp.board_tags_to_jsonb(legacy_tags text[]) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'color', '#6b7280') ORDER BY position), '[]'::jsonb)
  FROM unnest(legacy_tags) WITH ORDINALITY AS tag(name, position);
$$;
--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "tags" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "tags" SET DATA TYPE jsonb
  USING pg_temp.board_tags_to_jsonb(tags);
--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;
--> statement-breakpoint
DROP FUNCTION pg_temp.board_tags_to_jsonb(text[]);
