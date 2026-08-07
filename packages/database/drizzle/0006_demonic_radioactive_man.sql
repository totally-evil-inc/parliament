ALTER TABLE "invoice_acceptance" DROP CONSTRAINT "invoice_acceptance_invoice_snapshot_id_invoice_snapshot_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_acceptance" DROP CONSTRAINT "invoice_acceptance_public_link_id_invoice_public_link_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD CONSTRAINT "invoice_acceptance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD CONSTRAINT "invoice_acceptance_invoice_snapshot_id_invoice_snapshot_id_fk" FOREIGN KEY ("invoice_snapshot_id") REFERENCES "public"."invoice_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_acceptance" ADD CONSTRAINT "invoice_acceptance_public_link_id_invoice_public_link_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."invoice_public_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_action_agent_id_idx" ON "agent_action" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_action_user_id_idx" ON "agent_action" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_user_id_idx" ON "agent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_org_id_idx" ON "agent" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoice_acceptance_organization_id_idx" ON "invoice_acceptance" USING btree ("organization_id");