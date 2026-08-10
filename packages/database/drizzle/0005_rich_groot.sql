CREATE TABLE "agent_action" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"reason" text NOT NULL,
	"confidence_score" real DEFAULT 0.9 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"secret_hash" text,
	"policy" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_thread_activity" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text,
	"subject" text,
	"snippet" text,
	"from_email" text,
	"to_email" text,
	"activity_type" text NOT NULL,
	"status" text DEFAULT 'processed' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_watch_subscription" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"history_id" text,
	"expiration" timestamp,
	"topic_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_webhook_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"event_type" text,
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"status" text DEFAULT 'received' NOT NULL,
	"error_message" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_acceptance" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"invoice_snapshot_id" uuid NOT NULL,
	"public_link_id" uuid NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signature_text" text,
	"signature_image" text,
	"otp_verified" boolean DEFAULT false NOT NULL,
	"agreed_terms" boolean NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "public_link_otp" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_link_id" uuid NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "payment_link_url" text;--> statement-breakpoint
ALTER TABLE "proposal_acceptance" ADD COLUMN "signature_image" text;--> statement-breakpoint
ALTER TABLE "proposal_acceptance" ADD COLUMN "otp_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_action" ADD CONSTRAINT "agent_action_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action" ADD CONSTRAINT "agent_action_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_thread_activity" ADD CONSTRAINT "email_thread_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_watch_subscription" ADD CONSTRAINT "gmail_watch_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD CONSTRAINT "invoice_acceptance_invoice_snapshot_id_invoice_snapshot_id_fk" FOREIGN KEY ("invoice_snapshot_id") REFERENCES "public"."invoice_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD CONSTRAINT "invoice_acceptance_public_link_id_invoice_public_link_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."invoice_public_link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_thread_activity_user_id_idx" ON "email_thread_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_thread_activity_thread_id_idx" ON "email_thread_activity" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "gmail_watch_subscription_user_id_idx" ON "gmail_watch_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gmail_watch_subscription_user_email_idx" ON "gmail_watch_subscription" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "inbound_webhook_log_provider_idx" ON "inbound_webhook_log" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "inbound_webhook_log_status_idx" ON "inbound_webhook_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_acceptance_snapshot_id_idx" ON "invoice_acceptance" USING btree ("invoice_snapshot_id");--> statement-breakpoint
CREATE INDEX "invoice_acceptance_public_link_id_idx" ON "invoice_acceptance" USING btree ("public_link_id");--> statement-breakpoint
CREATE INDEX "public_link_otp_public_link_id_idx" ON "public_link_otp" USING btree ("public_link_id");--> statement-breakpoint
CREATE INDEX "public_link_otp_email_idx" ON "public_link_otp" USING btree ("email");