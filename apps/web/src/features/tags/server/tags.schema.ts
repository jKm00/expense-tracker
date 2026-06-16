import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "@/features/auth/server/auth.schema";

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
