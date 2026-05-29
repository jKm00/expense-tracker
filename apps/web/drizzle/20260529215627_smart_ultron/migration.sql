CREATE TABLE "automation_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"token_id" uuid,
	"transaction_id" uuid,
	"request_token_prefix" text,
	"request_method" text NOT NULL,
	"request_path" text NOT NULL,
	"provider" "automation_provider",
	"event_id" text,
	"request_body" text,
	"user_agent" text,
	"ip_address" text,
	"response_status" integer NOT NULL,
	"response_message" text NOT NULL,
	"response_body" text,
	"error_reason" text,
	"duplicate" boolean DEFAULT false NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "automation_request_logs_user_created_at_idx" ON "automation_request_logs" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "automation_request_logs_token_created_at_idx" ON "automation_request_logs" ("token_id","created_at");--> statement-breakpoint
ALTER TABLE "automation_request_logs" ADD CONSTRAINT "automation_request_logs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation_request_logs" ADD CONSTRAINT "automation_request_logs_token_id_automation_tokens_id_fkey" FOREIGN KEY ("token_id") REFERENCES "automation_tokens"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "automation_request_logs" ADD CONSTRAINT "automation_request_logs_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;