CREATE TYPE "automation_provider" AS ENUM('apple_pay');--> statement-breakpoint
ALTER TYPE "transaction_source" ADD VALUE 'automation';--> statement-breakpoint
CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"token_id" uuid NOT NULL,
	"provider" "automation_provider" NOT NULL,
	"event_id" text NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"date" timestamp NOT NULL,
	"store" text,
	"description" text,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_events_user_provider_event_unique" ON "automation_events" ("user_id","provider","event_id");--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_token_id_automation_tokens_id_fkey" FOREIGN KEY ("token_id") REFERENCES "automation_tokens"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_tokens" ADD CONSTRAINT "automation_tokens_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;