ALTER TABLE "kanban_items" ADD COLUMN "assignee_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "assignee_ids" text[] DEFAULT '{}'::text[] NOT NULL;
