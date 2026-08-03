import { user } from "@/features/auth/auth.schema";
import { products } from "@/features/products/products.schema";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const receiptItemMappings = pgTable(
  "receipt_item_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    normalizedItemName: text("normalized_item_name").notNull(),
    confirmationCount: integer("confirmation_count").notNull().default(1),
    lastConfirmedAt: timestamp("last_confirmed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("receipt_item_mappings_user_normalized_unique").on(
      table.userId,
      table.normalizedItemName,
    ),
    index("receipt_item_mappings_user_product_idx").on(
      table.userId,
      table.productId,
    ),
  ],
);
