CREATE TYPE "public"."alert_color" AS ENUM('neutral', 'info', 'warning', 'danger');--> statement-breakpoint
CREATE TABLE "alert" (
	"id" text PRIMARY KEY NOT NULL,
	"priority" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"link" text,
	"color" "alert_color" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;