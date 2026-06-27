CREATE TYPE "receipt_scan_attempt_status" AS ENUM('success', 'failed', 'rate_limited', 'rejected');--> statement-breakpoint
CREATE TYPE "receipt_scan_provider" AS ENUM('openai');--> statement-breakpoint
CREATE TABLE "receipt_item_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"normalized_item_name" text NOT NULL,
	"confirmation_count" integer DEFAULT 1 NOT NULL,
	"last_confirmed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_scan_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"provider" "receipt_scan_provider" NOT NULL,
	"status" "receipt_scan_attempt_status" NOT NULL,
	"item_count" integer,
	"duration_ms" integer,
	"error_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_item_mappings_user_normalized_unique" ON "receipt_item_mappings" ("user_id","normalized_item_name");--> statement-breakpoint
CREATE INDEX "receipt_item_mappings_user_product_idx" ON "receipt_item_mappings" ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "receipt_scan_attempts_user_created_idx" ON "receipt_scan_attempts" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "receipt_scan_attempts_user_status_created_idx" ON "receipt_scan_attempts" ("user_id","status","created_at");--> statement-breakpoint
ALTER TABLE "receipt_item_mappings" ADD CONSTRAINT "receipt_item_mappings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipt_item_mappings" ADD CONSTRAINT "receipt_item_mappings_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "receipt_scan_attempts" ADD CONSTRAINT "receipt_scan_attempts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;