ALTER TYPE "automation_provider" RENAME TO "integration_provider";--> statement-breakpoint
ALTER TABLE "automation_events" RENAME TO "integration_events";--> statement-breakpoint
ALTER TABLE "automation_request_logs" RENAME TO "integration_request_logs";--> statement-breakpoint
ALTER TABLE "automation_tokens" RENAME TO "integration_tokens";--> statement-breakpoint
ALTER INDEX "automation_events_user_provider_event_unique" RENAME TO "integration_events_user_provider_event_unique";--> statement-breakpoint
ALTER INDEX "automation_request_logs_user_created_at_idx" RENAME TO "integration_request_logs_user_created_at_idx";--> statement-breakpoint
ALTER INDEX "automation_request_logs_token_created_at_idx" RENAME TO "integration_request_logs_token_created_at_idx";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "transaction_source";--> statement-breakpoint
CREATE TYPE "transaction_source" AS ENUM('manual', 'recurring', 'scan', 'integration', 'shopping');--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "source" SET DATA TYPE "transaction_source" USING "source"::"transaction_source";