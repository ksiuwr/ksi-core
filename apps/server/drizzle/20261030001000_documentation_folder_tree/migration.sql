CREATE TABLE "doc_folders" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text REFERENCES "projects"("id"),
  "parent_id" text REFERENCES "doc_folders"("id"),
  "name" text NOT NULL,
  "translations" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "doc_folder_project_idx" ON "doc_folders" ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doc_folder_sibling_name_unique" ON "doc_folders"
  (coalesce("project_id", ''), coalesce("parent_id", ''), lower("name"));
--> statement-breakpoint
-- Backfill every ancestor, including folders referenced only by a pending suggestion or history.
WITH paths AS (
  SELECT project_id, folder FROM doc_pages
  UNION SELECT project_id, folder FROM doc_proposals
  UNION SELECT p.project_id, r.folder FROM doc_revisions r JOIN doc_pages p ON p.id = r.page_id
), ancestors AS (
  SELECT DISTINCT project_id, array_to_string((string_to_array(folder, '/'))[1:n], '/') AS path,
    (string_to_array(folder, '/'))[n] AS name,
    CASE WHEN n > 1 THEN array_to_string((string_to_array(folder, '/'))[1:n-1], '/') END AS parent
  FROM paths CROSS JOIN LATERAL generate_series(1, array_length(string_to_array(folder, '/'), 1)) n
  WHERE folder <> ''
)
INSERT INTO doc_folders (id, project_id, parent_id, name)
SELECT 'df_' || md5(coalesce(project_id, '') || ':' || path), project_id,
  CASE WHEN parent IS NOT NULL THEN 'df_' || md5(coalesce(project_id, '') || ':' || parent) END, name
FROM ancestors;
--> statement-breakpoint
ALTER TABLE "doc_pages" ADD COLUMN "folder_id" text REFERENCES "doc_folders"("id");
--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD COLUMN "folder_id" text REFERENCES "doc_folders"("id");
--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD COLUMN "folder_id" text REFERENCES "doc_folders"("id");
--> statement-breakpoint
UPDATE doc_pages SET folder_id = 'df_' || md5(coalesce(project_id, '') || ':' || folder) WHERE folder <> '';
--> statement-breakpoint
UPDATE doc_proposals SET folder_id = 'df_' || md5(coalesce(project_id, '') || ':' || folder) WHERE folder <> '';
--> statement-breakpoint
UPDATE doc_revisions r SET folder_id = 'df_' || md5(coalesce(p.project_id, '') || ':' || r.folder)
FROM doc_pages p WHERE p.id = r.page_id AND r.folder <> '';
