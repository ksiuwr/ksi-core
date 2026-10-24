ALTER TABLE "articles" ADD COLUMN "thumbnail_file_id" text REFERENCES "files"("id");
--> statement-breakpoint
ALTER TABLE "article_revisions" ADD COLUMN "thumbnail_file_id" text REFERENCES "files"("id");
