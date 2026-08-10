CREATE TYPE "public"."customer_status" AS ENUM('active', 'lead', 'inactive', 'churned');--> statement-breakpoint
ALTER TABLE "company" DROP COLUMN IF EXISTS "employee_range";--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "billing_email" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "status" "customer_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "preferred_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "default_payment_terms" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "employee_count" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_status" ON "company" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_company" ON "contact" USING btree ("company_id");
