CREATE TYPE "transaction_source" AS ENUM('receipt', 'recurring', 'manual');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"source" "transaction_source" NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "item_user_id_idx" ON "item" ("user_id");--> statement-breakpoint
CREATE INDEX "tag_user_id_idx" ON "tag" ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_user_id_date_idx" ON "transaction" ("user_id","date");--> statement-breakpoint
CREATE INDEX "transaction_item_id_idx" ON "transaction" ("item_id");--> statement-breakpoint
CREATE INDEX "transaction_user_id_type_idx" ON "transaction" ("user_id","type");--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_item_id_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE;