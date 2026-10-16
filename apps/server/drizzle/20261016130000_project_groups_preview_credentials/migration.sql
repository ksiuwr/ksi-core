CREATE TABLE "project_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_group_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_group_name_unique" ON "project_groups" ("project_id","name");
--> statement-breakpoint
CREATE TABLE "project_group_members" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_group_members_group_id_project_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "project_groups"("id") ON DELETE cascade,
	CONSTRAINT "project_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_group_member_unique" ON "project_group_members" ("group_id","user_id");
--> statement-breakpoint
CREATE TABLE "preview_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"preview_id" text NOT NULL,
	"branch" text NOT NULL,
	"commit" text NOT NULL,
	"preview_url" text NOT NULL,
	"accounts" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preview_credentials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "preview_credentials_project_preview_unique" ON "preview_credentials" ("project_id","preview_id");
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "member_permissions" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "non_member_permissions" text[] DEFAULT '{}' NOT NULL;
