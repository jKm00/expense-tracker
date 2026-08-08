import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  palette: varchar("palette", { length: 32 }).notNull().default("default"),
  mode: varchar("mode", { length: 8 }).notNull().default("dark"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
