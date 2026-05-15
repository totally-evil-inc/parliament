CREATE TABLE "jwks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
