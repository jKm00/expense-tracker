import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "@/features/products/products.schema";
import { entryType } from "@/features/transactions/transactions.schema";

export const recurringInterval = pgEnum("recurring_interval", [
  "weekly",
  "monthly",
  "yearly",
]);

export const recurring = pgTable("recurring", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  interval: recurringInterval().notNull(),
  type: entryType().notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end"),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
