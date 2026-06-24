import { user } from "@/features/auth/auth.schema";
import { products } from "@/features/products/products.schema";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const receiptScanAttemptStatus = pgEnum("receipt_scan_attempt_status", [
  "success",
  "failed",
  "rate_limited",
  "rejected",
]);

export const receiptScanProvider = pgEnum("receipt_scan_provider", ["openai"]);

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

export const receiptScanAttempts = pgTable(
  "receipt_scan_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: receiptScanProvider("provider").notNull(),
    status: receiptScanAttemptStatus("status").notNull(),
    itemCount: integer("item_count"),
    durationMs: integer("duration_ms"),
    errorCategory: text("error_category"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("receipt_scan_attempts_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("receipt_scan_attempts_user_status_created_idx").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
  ],
);
