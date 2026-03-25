import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { product } from "../products/product.schema";
import { transactionType } from "../transactions/transaction.schema";

export const recurringProduct = pgTable(
  "recurring_product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => product.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    interval: text("recurring_interval").notNull(),
    type: transactionType().notNull().default("expense"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("recurring_product_product_id_idx").on(table.productId)],
);
