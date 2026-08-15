CREATE TABLE "scheduled_document_dispatch" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_id" uuid NOT NULL,
	"document_title" text NOT NULL,
	"recipient_email" text NOT NULL,
	"cc_recipients" jsonb DEFAULT '[]'::jsonb,
	"bcc_recipients" jsonb DEFAULT '[]'::jsonb,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"send_method" text DEFAULT 'gmail' NOT NULL,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_document_dispatch" ADD CONSTRAINT "scheduled_document_dispatch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_document_dispatch" ADD CONSTRAINT "scheduled_document_dispatch_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scheduled_dispatch_due" ON "scheduled_document_dispatch" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_scheduled_dispatch_doc" ON "scheduled_document_dispatch" USING btree ("organization_id","document_type","document_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_dispatch_user" ON "scheduled_document_dispatch" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_dispatch_org" ON "scheduled_document_dispatch" USING btree ("organization_id");