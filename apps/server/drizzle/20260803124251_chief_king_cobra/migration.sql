ALTER TABLE "account" RENAME TO "accounts";--> statement-breakpoint
ALTER TABLE "alert" RENAME TO "alerts";--> statement-breakpoint
ALTER TABLE "session" RENAME TO "sessions";--> statement-breakpoint
ALTER TABLE "user" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "verification" RENAME TO "verifications";--> statement-breakpoint
ALTER TABLE "alerts" RENAME COLUMN "user_id" TO "created_by";