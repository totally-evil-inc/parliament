ALTER TABLE "proposal_acceptance" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_event" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_acceptance" ADD CONSTRAINT "proposal_acceptance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_event" ADD CONSTRAINT "proposal_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_acceptance_organization_id_idx" ON "proposal_acceptance" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "proposal_event_organization_id_idx" ON "proposal_event" USING btree ("organization_id");