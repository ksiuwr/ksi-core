-- Folder names remain in historical snapshots even after the empty folder is deleted.
ALTER TABLE "doc_revisions" DROP CONSTRAINT "doc_revisions_folder_id_fkey";
--> statement-breakpoint
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "doc_folders"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "doc_proposals" DROP CONSTRAINT "doc_proposals_folder_id_fkey";
--> statement-breakpoint
ALTER TABLE "doc_proposals" ADD CONSTRAINT "doc_proposals_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "doc_folders"("id") ON DELETE SET NULL;
