import {
  boolean,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";
import { products } from "@/features/products/products.schema";
import { entryType } from "@/features/transactions/transactions.schema";

export const shortcuts = pgTable(
  "shortcuts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    store: text("store"),
    type: entryType().notNull(),
    // NULL means the price is asked for every time the shortcut is run
    price: numeric("price", { precision: 10, scale: 2 }),
    showOnHome: boolean("show_on_home").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("shortcuts_user_id_idx").on(table.userId)],
);

export const shortcutProducts = pgTable(
  "shortcut_products",
  {
    shortcutId: uuid("shortcut_id")
      .notNull()
      .references(() => shortcuts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.shortcutId, table.productId] })],
);
