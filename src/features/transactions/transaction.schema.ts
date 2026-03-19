import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { item } from "../items/item.schema";
import { user } from "../auth/auth.schema";

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const transactionSource = pgEnum("transaction_source", [
  "receipt",
  "recurring",
  "manual",
]);

export const transaction = pgTable(
  "transaction",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    type: transactionType().notNull(),
    source: transactionSource().notNull(),
    date: date("date").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("transaction_user_id_date_idx").on(table.userId, table.date),
    index("transaction_item_id_idx").on(table.itemId),
    index("transaction_user_id_type_idx").on(table.userId, table.type),
  ],
);
