CREATE TABLE "doc_pages" (
	"id" text PRIMARY KEY,
	"project_id" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"markdown" text DEFAULT '' NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_revisions" (
	"id" text PRIMARY KEY,
	"page_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"markdown" text NOT NULL,
	"public" boolean NOT NULL,
	"author_id" text NOT NULL,
	"reviewer_id" text,
	"proposal_id" text,
	"reason" text DEFAULT '' NOT NULL,
	"additions" integer DEFAULT 0 NOT NULL,
	"deletions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_proposals" (
	"id" text PRIMARY KEY,
	"project_id" text,
	"page_id" text,
	"slug" text,
	"base_version" integer,
	"title" text NOT NULL,
	"markdown" text NOT NULL,
	"public" boolean NOT NULL,
	"reason" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"author_id" text NOT NULL,
	"reviewer_id" text,
	"review_note" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "doc_page_project_slug_unique" ON "doc_pages" ("project_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_page_association_slug_unique" ON "doc_pages" ("slug") WHERE "project_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_revision_unique" ON "doc_revisions" ("page_id","version");--> statement-breakpoint
CREATE INDEX "doc_revision_author_idx" ON "doc_revisions" ("author_id");--> statement-breakpoint
CREATE INDEX "doc_proposal_state_idx" ON "doc_proposals" ("state","project_id");--> statement-breakpoint
ALTER TABLE "doc_pages" ADD CONSTRAINT "doc_pages_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "doc_pages" ADD CONSTRAINT "doc_pages_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_page_id_doc_pages_id_fkey" FOREIGN KEY ("page_id") REFERENCES "doc_pages"("id");--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_reviewer_id_users_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD CONSTRAINT "doc_proposals_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD CONSTRAINT "doc_proposals_page_id_doc_pages_id_fkey" FOREIGN KEY ("page_id") REFERENCES "doc_pages"("id");--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD CONSTRAINT "doc_proposals_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD CONSTRAINT "doc_proposals_reviewer_id_users_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id");
