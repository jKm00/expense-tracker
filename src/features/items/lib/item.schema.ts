import { defineRelations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const item = pgTable("item", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const intervalTypes = pgEnum("interval", [
  "weekly",
  "monthly",
  "yearly",
]);

export const recurringItem = pgTable(
  "recurring_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .unique()
      .references(() => item.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    interval: intervalTypes().notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("recurring_item_item_id_idx").on(table.itemId)],
);

export const tag = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itemTag = pgTable(
  "item_tag",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tagId] }),
    index("item_tag_item_id_idx").on(table.itemId),
    index("item_tag_tag_id_idx").on(table.tagId),
  ],
);

export const relations = defineRelations(
  { item, recurringItem, tag, itemTag },
  (r) => ({
    item: {
      recurringItem: r.one.recurringItem({
        from: r.item.id,
        to: r.recurringItem.itemId,
      }),
      tags: r.many.tag({
        from: r.item.id.through(r.itemTag.itemId),
        to: r.tag.id.through(r.itemTag.tagId),
      }),
    },
    recurringItem: {
      item: r.one.item({
        from: r.recurringItem.itemId,
        to: r.item.id,
      }),
    },
    tag: {
      items: r.many.item({
        from: r.tag.id.through(r.itemTag.tagId),
        to: r.item.id.through(r.itemTag.itemId),
      }),
    },
  }),
);
