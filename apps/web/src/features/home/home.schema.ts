import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";

export const homeWidgetType = pgEnum("home_widget_type", [
  "quick_log",
  "shortcuts",
]);

export const homeWidgets = pgTable(
  "home_widgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: homeWidgetType().notNull(),
    position: integer("position").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("home_widgets_user_type_idx").on(table.userId, table.type)],
);
