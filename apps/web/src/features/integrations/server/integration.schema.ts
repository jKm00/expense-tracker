import { user } from "@/features/auth/server/auth.schema";
import { transactions } from "@/features/transactions/server/transactions.schema";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const integrationProvider = pgEnum("integration_provider", ["apple_pay"]);

export const integrationTokens = pgTable("integration_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
});

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenId: uuid("token_id")
      .notNull()
      .references(() => integrationTokens.id, { onDelete: "cascade" }),
    provider: integrationProvider().notNull(),
    eventId: text("event_id").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    date: timestamp("date").notNull(),
    store: text("store"),
    description: text("description"),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("integration_events_user_provider_event_unique").on(
      table.userId,
      table.provider,
      table.eventId,
    ),
  ],
);

export const integrationRequestLogs = pgTable(
  "integration_request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenId: uuid("token_id").references(() => integrationTokens.id, {
      onDelete: "set null",
    }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    requestTokenPrefix: text("request_token_prefix"),
    requestMethod: text("request_method").notNull(),
    requestPath: text("request_path").notNull(),
    provider: integrationProvider(),
    eventId: text("event_id"),
    requestBody: text("request_body"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    responseStatus: integer("response_status").notNull(),
    responseMessage: text("response_message").notNull(),
    responseBody: text("response_body"),
    errorReason: text("error_reason"),
    duplicate: boolean("duplicate").notNull().default(false),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("integration_request_logs_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("integration_request_logs_token_created_at_idx").on(
      table.tokenId,
      table.createdAt,
    ),
  ],
);
