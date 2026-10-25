CREATE TABLE "deadline_reminders" (
	"id" text PRIMARY KEY,
	"item_id" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"days" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanban_items" ADD COLUMN "due_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "deadline_reminder_unique" ON "deadline_reminders" ("item_id","due_at","days");--> statement-breakpoint
ALTER TABLE "deadline_reminders" ADD CONSTRAINT "deadline_reminders_item_id_kanban_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "kanban_items"("id") ON DELETE CASCADE;