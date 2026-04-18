import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";
import { products } from "@/features/products/products.schema";
import { tags } from "@/features/tags/tags.schema";

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "recurring",
  "scan",
]);

export const entryType = pgEnum("entry_type", entryTypes);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  store: text("store"),
  description: text("description"),
  source: transactionSource().notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const entries = pgTable("entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  type: entryType().notNull(),
});

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagId] })],
);
