CREATE TABLE "proposal_acceptance" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"proposal_snapshot_id" uuid NOT NULL,
	"public_link_id" uuid NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signature_text" text,
	"agreed_terms" boolean NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "proposal_draft" (
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
CREATE TABLE "proposal_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"proposal_snapshot_id" uuid NOT NULL,
	"public_link_id" uuid,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "proposal_public_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"proposal_snapshot_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "proposal_public_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "proposal_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"proposal_draft_id" uuid NOT NULL,
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
ALTER TABLE "proposal_acceptance" ADD CONSTRAINT "proposal_acceptance_proposal_snapshot_id_proposal_snapshot_id_fk" FOREIGN KEY ("proposal_snapshot_id") REFERENCES "public"."proposal_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_acceptance" ADD CONSTRAINT "proposal_acceptance_public_link_id_proposal_public_link_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."proposal_public_link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_draft" ADD CONSTRAINT "proposal_draft_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_draft" ADD CONSTRAINT "proposal_draft_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_event" ADD CONSTRAINT "proposal_event_proposal_snapshot_id_proposal_snapshot_id_fk" FOREIGN KEY ("proposal_snapshot_id") REFERENCES "public"."proposal_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_event" ADD CONSTRAINT "proposal_event_public_link_id_proposal_public_link_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."proposal_public_link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_public_link" ADD CONSTRAINT "proposal_public_link_proposal_snapshot_id_proposal_snapshot_id_fk" FOREIGN KEY ("proposal_snapshot_id") REFERENCES "public"."proposal_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_public_link" ADD CONSTRAINT "proposal_public_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_snapshot" ADD CONSTRAINT "proposal_snapshot_proposal_draft_id_proposal_draft_id_fk" FOREIGN KEY ("proposal_draft_id") REFERENCES "public"."proposal_draft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_snapshot" ADD CONSTRAINT "proposal_snapshot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_snapshot" ADD CONSTRAINT "proposal_snapshot_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_acceptance_snapshot_id_idx" ON "proposal_acceptance" USING btree ("proposal_snapshot_id");--> statement-breakpoint
CREATE INDEX "proposal_acceptance_public_link_id_idx" ON "proposal_acceptance" USING btree ("public_link_id");--> statement-breakpoint
CREATE INDEX "proposal_draft_organization_id_idx" ON "proposal_draft" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "proposal_draft_status_idx" ON "proposal_draft" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposal_event_snapshot_id_idx" ON "proposal_event" USING btree ("proposal_snapshot_id");--> statement-breakpoint
CREATE INDEX "proposal_event_public_link_id_idx" ON "proposal_event" USING btree ("public_link_id");--> statement-breakpoint
CREATE INDEX "proposal_event_type_idx" ON "proposal_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "proposal_public_link_snapshot_id_idx" ON "proposal_public_link" USING btree ("proposal_snapshot_id");--> statement-breakpoint
CREATE INDEX "proposal_public_link_organization_id_idx" ON "proposal_public_link" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "proposal_snapshot_draft_id_idx" ON "proposal_snapshot" USING btree ("proposal_draft_id");--> statement-breakpoint
CREATE INDEX "proposal_snapshot_organization_id_idx" ON "proposal_snapshot" USING btree ("organization_id");