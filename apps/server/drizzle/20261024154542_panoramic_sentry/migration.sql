CREATE TABLE "collaboration_counters" (
	"scope_key" text PRIMARY KEY,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanban_items" ADD COLUMN "reference_number" integer;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "reference_number" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_board_reference_unique" ON "kanban_items" ("board_id","reference_number");--> statement-breakpoint
CREATE UNIQUE INDEX "thread_project_reference_unique" ON "threads" ("project_id","reference_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "thread_association_reference_unique" ON "threads" ("reference_number") WHERE "project_id" IS NULL;
--> statement-breakpoint
WITH resources AS (
  SELECT k.id, 'item' AS kind, coalesce('project:' || b.project_id, 'association') AS scope_key, k.created_at
  FROM kanban_items k JOIN boards b ON b.id = k.board_id
  UNION ALL
  SELECT t.id, 'thread' AS kind, coalesce('project:' || t.project_id, 'association') AS scope_key, t.created_at FROM threads t
), numbered AS (
  SELECT id, kind, scope_key, row_number() OVER (PARTITION BY scope_key ORDER BY created_at, id, kind)::integer AS number FROM resources
)
UPDATE kanban_items k SET reference_number = n.number FROM numbered n WHERE n.kind = 'item' AND n.id = k.id;
--> statement-breakpoint
WITH resources AS (
  SELECT k.id, 'item' AS kind, coalesce('project:' || b.project_id, 'association') AS scope_key, k.created_at
  FROM kanban_items k JOIN boards b ON b.id = k.board_id
  UNION ALL
  SELECT t.id, 'thread' AS kind, coalesce('project:' || t.project_id, 'association') AS scope_key, t.created_at FROM threads t
), numbered AS (
  SELECT id, kind, scope_key, row_number() OVER (PARTITION BY scope_key ORDER BY created_at, id, kind)::integer AS number FROM resources
)
UPDATE threads t SET reference_number = n.number FROM numbered n WHERE n.kind = 'thread' AND n.id = t.id;
--> statement-breakpoint
INSERT INTO collaboration_counters (scope_key, last_number)
SELECT scope_key, max(number) FROM (
  SELECT coalesce('project:' || b.project_id, 'association') AS scope_key, k.reference_number AS number FROM kanban_items k JOIN boards b ON b.id = k.board_id
  UNION ALL SELECT coalesce('project:' || t.project_id, 'association'), t.reference_number FROM threads t
) resources GROUP BY scope_key;
