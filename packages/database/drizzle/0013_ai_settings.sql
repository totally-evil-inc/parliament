CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"api_key" text,
	"base_url" text,
	"default_model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
