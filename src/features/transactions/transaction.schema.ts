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
import { product } from "../products/product.schema";
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
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    type: transactionType().notNull(),
    source: transactionSource().notNull(),
    date: date("date").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("transaction_user_id_date_idx").on(table.userId, table.date),
    index("transaction_product_id_idx").on(table.productId),
    index("transaction_user_id_type_idx").on(table.userId, table.type),
  ],
);
