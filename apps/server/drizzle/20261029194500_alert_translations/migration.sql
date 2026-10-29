ALTER TABLE "alerts" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "alerts" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
