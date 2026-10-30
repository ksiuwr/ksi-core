ALTER TABLE "doc_pages" ADD COLUMN "folder" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_pages" ADD COLUMN "translations" jsonb DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD COLUMN "folder" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD COLUMN "translations" jsonb DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD COLUMN "folder" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD COLUMN "translations" jsonb DEFAULT '{}' NOT NULL;
