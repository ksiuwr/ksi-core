ALTER TABLE "boards" RENAME COLUMN "tags" TO "labels";
--> statement-breakpoint
ALTER TABLE "kanban_items" RENAME COLUMN "tags" TO "labels";
