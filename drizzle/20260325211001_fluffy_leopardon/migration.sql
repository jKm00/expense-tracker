ALTER TABLE "recurring_product" ADD COLUMN "type" "transaction_type" DEFAULT 'expense'::"transaction_type" NOT NULL;--> statement-breakpoint
DROP TYPE "recurring_interval";