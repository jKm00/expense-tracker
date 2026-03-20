ALTER TABLE "item" RENAME TO "product";--> statement-breakpoint
ALTER TABLE "item_tag" RENAME TO "product_tag";--> statement-breakpoint
ALTER TABLE "recurring_item" RENAME TO "recurring_product";--> statement-breakpoint
ALTER TABLE "product_tag" RENAME COLUMN "item_id" TO "product_id";--> statement-breakpoint
ALTER TABLE "recurring_product" RENAME COLUMN "item_id" TO "product_id";--> statement-breakpoint
ALTER TABLE "transaction" RENAME COLUMN "item_id" TO "product_id";--> statement-breakpoint
ALTER INDEX "item_user_id_idx" RENAME TO "product_user_id_idx";--> statement-breakpoint
ALTER INDEX "item_tag_item_id_idx" RENAME TO "product_tag_product_id_idx";--> statement-breakpoint
ALTER INDEX "item_tag_tag_id_idx" RENAME TO "product_tag_tag_id_idx";--> statement-breakpoint
ALTER INDEX "recurring_item_item_id_idx" RENAME TO "recurring_product_product_id_idx";--> statement-breakpoint
ALTER INDEX "transaction_item_id_idx" RENAME TO "transaction_product_id_idx";