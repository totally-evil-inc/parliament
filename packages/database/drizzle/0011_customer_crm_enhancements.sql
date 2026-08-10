DO $$ BEGIN
  CREATE TYPE "public"."customer_status" AS ENUM('active', 'lead', 'inactive', 'churned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "company" DROP COLUMN IF EXISTS "employee_range";--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "billing_email" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "website" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "vat_number" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "address_line_1" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "address_line_2" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "state" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "zip" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "note" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "status" "customer_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "preferred_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "default_payment_terms" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "logo_url" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "employee_count" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_status" ON "company" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_company" ON "contact" USING btree ("company_id");
