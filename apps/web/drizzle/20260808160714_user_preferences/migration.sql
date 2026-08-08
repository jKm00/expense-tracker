CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY,
	"palette" varchar(32) DEFAULT 'default' NOT NULL,
	"mode" varchar(8) DEFAULT 'dark' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
