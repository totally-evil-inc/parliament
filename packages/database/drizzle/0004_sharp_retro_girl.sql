CREATE TABLE "invoice_draft" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_snapshot_id" uuid NOT NULL,
	"public_link_id" uuid,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "invoice_public_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_snapshot_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "invoice_public_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoice_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_draft_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"document" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"template_id" text NOT NULL,
	"template_version" integer NOT NULL,
	"calculation_version" text,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_draft" ADD CONSTRAINT "invoice_draft_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_draft" ADD CONSTRAINT "invoice_draft_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_event" ADD CONSTRAINT "invoice_event_invoice_snapshot_id_invoice_snapshot_id_fk" FOREIGN KEY ("invoice_snapshot_id") REFERENCES "public"."invoice_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_event" ADD CONSTRAINT "invoice_event_public_link_id_invoice_public_link_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."invoice_public_link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_public_link" ADD CONSTRAINT "invoice_public_link_invoice_snapshot_id_invoice_snapshot_id_fk" FOREIGN KEY ("invoice_snapshot_id") REFERENCES "public"."invoice_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_public_link" ADD CONSTRAINT "invoice_public_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_snapshot" ADD CONSTRAINT "invoice_snapshot_invoice_draft_id_invoice_draft_id_fk" FOREIGN KEY ("invoice_draft_id") REFERENCES "public"."invoice_draft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_snapshot" ADD CONSTRAINT "invoice_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_snapshot" ADD CONSTRAINT "invoice_snapshot_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_draft_organization_id_idx" ON "invoice_draft" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_draft_status_idx" ON "invoice_draft" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_event_snapshot_id_idx" ON "invoice_event" USING btree ("invoice_snapshot_id");--> statement-breakpoint
CREATE INDEX "invoice_event_public_link_id_idx" ON "invoice_event" USING btree ("public_link_id");--> statement-breakpoint
CREATE INDEX "invoice_event_type_idx" ON "invoice_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "invoice_public_link_snapshot_id_idx" ON "invoice_public_link" USING btree ("invoice_snapshot_id");--> statement-breakpoint
CREATE INDEX "invoice_public_link_organization_id_idx" ON "invoice_public_link" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_snapshot_draft_id_idx" ON "invoice_snapshot" USING btree ("invoice_draft_id");--> statement-breakpoint
CREATE INDEX "invoice_snapshot_organization_id_idx" ON "invoice_snapshot" USING btree ("organization_id");