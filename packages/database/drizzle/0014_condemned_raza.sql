ALTER TABLE "ai_settings" DROP CONSTRAINT "ai_settings_organization_id_unique";--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "name" text DEFAULT 'Default Provider' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "ai_settings" SET "is_active" = true;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_organization_id_name_unique" UNIQUE("organization_id","name");