# Plan: Remove shared `packages/db` and inline into apps

## Overview

Remove `packages/db` entirely. Each app becomes self-contained with its own schema, relations, and db client. No shared package dependency. Schemas live in feature directories (not `lib/db/schemas/`). Each app loads `.env` only from its own root.

## Current State

- `packages/db/src/` contains: 5 schema files, `relations.ts`, `schema.ts` (barrel), `index.ts` (createDb + re-exports)
- `apps/web` has thin re-export wrappers in `src/lib/db/` and `src/features/*/schema.ts`
- `apps/job` imports `createDb`, `Database`, `recurring`, `products`, `transactions`, `entries` from `@expense-tracker/db`
- `drizzle.config.ts` points to `../../packages/db/src/schema.ts` and loads `../../.env`
- Scripts (`reset.ts`, `seed.ts`, `list-users.ts`) resolve `.env` from repo root via `../../../../..`
- `apps/web/src/server-plugins/env.ts` loads `../../.env.local` and `../../.env` (repo root fallback)
- `apps/job/src/index.ts` loads `../../../.env` (repo root fallback)

## Files that import `@expense-tracker/db`

| File | Imports |
|------|---------|
| `apps/web/src/lib/db/index.ts` | `createDb` |
| `apps/web/src/lib/db/schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/lib/db/relations.ts` | `relations` |
| `apps/web/src/features/auth/auth.schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/features/products/products.schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/features/tags/tags.schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/features/recurring/recurring.schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/features/transactions/transactions.schema.ts` | `* from @expense-tracker/db/schema` |
| `apps/web/src/features/transactions/transactions.models.ts` | `EntryType` from `@expense-tracker/db/schema` |
| `apps/job/src/index.ts` | `createDb` |
| `apps/job/src/process-recurring.ts` | `Database`, `recurring`, `products`, `transactions`, `entries` |
| `apps/web/drizzle.config.ts` | schema path: `../../packages/db/src/schema.ts` |

---

## Step 1: Replace feature schema files with real implementations

Each feature schema file currently does `export * from "@expense-tracker/db/schema"`. Replace with the actual schema definitions copied from `packages/db/src/schemas/`, using `@/` alias imports for cross-feature references.

> **Note:** The web app's tsconfig has `"@/*": ["./src/*"]` path alias configured.

### 1a. `apps/web/src/features/auth/auth.schema.ts`

No cross-feature imports needed — only imports from `drizzle-orm/pg-core`.

```ts
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});
```

### 1b. `apps/web/src/features/tags/tags.schema.ts`

Imports `user` from auth feature via `@/` alias.

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";

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
```

### 1c. `apps/web/src/features/products/products.schema.ts`

Imports `user` from auth and `tags` from tags feature.

```ts
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";
import { tags } from "@/features/tags/tags.schema";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })],
);
```

### 1d. `apps/web/src/features/transactions/transactions.schema.ts`

Imports `user` from auth, `products` from products, `tags` from tags.

```ts
import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/features/auth/auth.schema";
import { products } from "@/features/products/products.schema";
import { tags } from "@/features/tags/tags.schema";

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "recurring",
  "scan",
]);

export const entryType = pgEnum("entry_type", entryTypes);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  store: text("store"),
  description: text("description"),
  source: transactionSource().notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const entries = pgTable("entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  type: entryType().notNull(),
});

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagId] })],
);
```

### 1e. `apps/web/src/features/recurring/recurring.schema.ts`

Imports `products` from products feature and `entryType` from transactions feature.

```ts
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
```

---

## Step 2: Update `apps/web/src/lib/db/schema.ts`

Replace the `@expense-tracker/db` re-export with imports from feature schemas:

**File:** `apps/web/src/lib/db/schema.ts`

```ts
export * from "@/features/auth/auth.schema";
export * from "@/features/tags/tags.schema";
export * from "@/features/products/products.schema";
export * from "@/features/transactions/transactions.schema";
export * from "@/features/recurring/recurring.schema";
```

---

## Step 3: Update `apps/web/src/lib/db/relations.ts`

Replace the re-export with the full relations definition, importing from feature schemas:

**File:** `apps/web/src/lib/db/relations.ts`

```ts
import {
  account,
  session,
  user,
  verification,
} from "@/features/auth/auth.schema";
import { products, productTags } from "@/features/products/products.schema";
import { recurring } from "@/features/recurring/recurring.schema";
import { tags } from "@/features/tags/tags.schema";
import {
  entries,
  entryTags,
  transactions,
} from "@/features/transactions/transactions.schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(
  {
    // Auth
    user,
    session,
    account,
    verification,
    // Product
    products,
    recurring,
    tags,
    productTags,
    // Transactions
    transactions,
    entries,
    entryTags,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      products: r.many.products(),
      tags: r.many.tags(),
      transactions: r.many.transactions(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    products: {
      user: r.one.user({
        from: r.products.userId,
        to: r.user.id,
      }),
      recurring: r.many.recurring({
        from: r.products.id,
        to: r.recurring.productId,
      }),
      tags: r.many.tags({
        from: r.products.id.through(r.productTags.productId),
        to: r.tags.id.through(r.productTags.tagId),
      }),
      entries: r.many.entries({
        from: r.products.id,
        to: r.entries.productId,
      }),
    },
    recurring: {
      products: r.one.products({
        from: r.recurring.productId,
        to: r.products.id,
      }),
    },
    tags: {
      user: r.one.user({
        from: r.tags.userId,
        to: r.user.id,
      }),
      products: r.many.products({
        from: r.tags.id.through(r.productTags.tagId),
        to: r.products.id.through(r.productTags.productId),
      }),
      entries: r.many.entries({
        from: r.tags.id.through(r.entryTags.tagId),
        to: r.entries.id.through(r.entryTags.entryId),
      }),
    },
    transactions: {
      user: r.one.user({
        from: r.transactions.userId,
        to: r.user.id,
      }),
      entries: r.many.entries({
        from: r.transactions.id,
        to: r.entries.transactionId,
      }),
    },
    entries: {
      products: r.one.products({
        from: r.entries.productId,
        to: r.products.id,
      }),
      transactions: r.one.transactions({
        from: r.entries.transactionId,
        to: r.transactions.id,
      }),
      tags: r.many.tags({
        from: r.entries.id.through(r.entryTags.entryId),
        to: r.tags.id.through(r.entryTags.tagId),
      }),
    },
  }),
);
```

---

## Step 4: Update `apps/web/src/lib/db/index.ts`

Replace the shared import with inline implementation:

**File:** `apps/web/src/lib/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { relations } from "./relations";

function createDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema, relations });
}

export type Database = ReturnType<typeof createDb>;

export const db = createDb(process.env.DATABASE_URL!);
```

---

## Step 5: Fix `apps/web/src/features/transactions/transactions.models.ts`

**File:** `apps/web/src/features/transactions/transactions.models.ts:4`

Change:
```ts
import type { EntryType as _EntryType } from "@expense-tracker/db/schema";
```
To:
```ts
import type { EntryType as _EntryType } from "./transactions.schema";
```

> `transactions.schema.ts` now exports `EntryType` directly (defined in Step 1d).

---

## Step 6: Update `apps/web/drizzle.config.ts` — schema path + env

**File:** `apps/web/drizzle.config.ts`

Change from:
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ["../../.env.local", "../../.env", ".env.local", ".env"] });

export default defineConfig({
  out: "./drizzle",
  schema: "../../packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
```

To:
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
```

**Changes:** (1) Remove `../../.env.local` and `../../.env` from dotenv paths. (2) Update schema path from `../../packages/db/src/schema.ts` to `./src/lib/db/schema.ts`.

---

## Step 7: Update `apps/web/src/server-plugins/env.ts` — remove repo root fallback

**File:** `apps/web/src/server-plugins/env.ts`

Change from:
```ts
config({ path: ["../../.env.local", "../../.env", ".env.local", ".env"] });
```

To:
```ts
config({ path: [".env.local", ".env"] });
```

> This plugin runs from `apps/web/` so relative `.env` already resolves to `apps/web/.env`.

---

## Step 8: Update `apps/web/src/lib/db/reset.ts` — app-local env only

**File:** `apps/web/src/lib/db/reset.ts:7-9`

Change from:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../../..");
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")] });
```

To:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../..");
config({ path: [path.join(appRoot, ".env.local"), path.join(appRoot, ".env")] });
```

> `__dirname` is `apps/web/src/lib/db/`. Going up 3 levels (`../../..`) reaches `apps/web/`.

---

## Step 9: Update `apps/web/src/lib/db/seed.ts` — app-local env only

**File:** `apps/web/src/lib/db/seed.ts:8-10`

Change from:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../../..");
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")] });
```

To:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../..");
config({ path: [path.join(appRoot, ".env.local"), path.join(appRoot, ".env")] });
```

---

## Step 10: Update `apps/web/src/lib/db/list-users.ts` — app-local env only

**File:** `apps/web/src/lib/db/list-users.ts:7-9`

Change from:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../../..");
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")] });
```

To:
```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../..");
config({ path: [path.join(appRoot, ".env.local"), path.join(appRoot, ".env")] });
```

---

## Step 11: Create `apps/job/src/db/` with schema, relations, and client

The job app needs all schemas (FK references chain through all of them). Copy schema definitions into `apps/job/src/db/schemas/`.

### 11a. `apps/job/src/db/schemas/auth.schema.ts`

Same content as Step 1a (identical — no `@/` alias in job app, use relative imports).

```ts
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});
```

### 11b. `apps/job/src/db/schemas/tags.schema.ts`

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

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
```

### 11c. `apps/job/src/db/schemas/products.schema.ts`

```ts
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";
import { tags } from "./tags.schema";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })],
);
```

### 11d. `apps/job/src/db/schemas/transactions.schema.ts`

```ts
import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";
import { products } from "./products.schema";
import { tags } from "./tags.schema";

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export const transactionSource = pgEnum("transaction_source", [
  "manual",
  "recurring",
  "scan",
]);

export const entryType = pgEnum("entry_type", entryTypes);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  store: text("store"),
  description: text("description"),
  source: transactionSource().notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const entries = pgTable("entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  type: entryType().notNull(),
});

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagId] })],
);
```

### 11e. `apps/job/src/db/schemas/recurring.schema.ts`

```ts
import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./products.schema";
import { entryType } from "./transactions.schema";

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
```

### 11f. `apps/job/src/db/schema.ts`

```ts
export * from "./schemas/auth.schema";
export * from "./schemas/products.schema";
export * from "./schemas/recurring.schema";
export * from "./schemas/tags.schema";
export * from "./schemas/transactions.schema";
```

### 11g. `apps/job/src/db/relations.ts`

Same relations definition as Step 3, but with relative imports:

```ts
import {
  account,
  session,
  user,
  verification,
} from "./schemas/auth.schema";
import { products, productTags } from "./schemas/products.schema";
import { recurring } from "./schemas/recurring.schema";
import { tags } from "./schemas/tags.schema";
import {
  entries,
  entryTags,
  transactions,
} from "./schemas/transactions.schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    products,
    recurring,
    tags,
    productTags,
    transactions,
    entries,
    entryTags,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      products: r.many.products(),
      tags: r.many.tags(),
      transactions: r.many.transactions(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    products: {
      user: r.one.user({
        from: r.products.userId,
        to: r.user.id,
      }),
      recurring: r.many.recurring({
        from: r.products.id,
        to: r.recurring.productId,
      }),
      tags: r.many.tags({
        from: r.products.id.through(r.productTags.productId),
        to: r.tags.id.through(r.productTags.tagId),
      }),
      entries: r.many.entries({
        from: r.products.id,
        to: r.entries.productId,
      }),
    },
    recurring: {
      products: r.one.products({
        from: r.recurring.productId,
        to: r.products.id,
      }),
    },
    tags: {
      user: r.one.user({
        from: r.tags.userId,
        to: r.user.id,
      }),
      products: r.many.products({
        from: r.tags.id.through(r.productTags.tagId),
        to: r.products.id.through(r.productTags.productId),
      }),
      entries: r.many.entries({
        from: r.tags.id.through(r.entryTags.tagId),
        to: r.entries.id.through(r.entryTags.entryId),
      }),
    },
    transactions: {
      user: r.one.user({
        from: r.transactions.userId,
        to: r.user.id,
      }),
      entries: r.many.entries({
        from: r.transactions.id,
        to: r.entries.transactionId,
      }),
    },
    entries: {
      products: r.one.products({
        from: r.entries.productId,
        to: r.products.id,
      }),
      transactions: r.one.transactions({
        from: r.entries.transactionId,
        to: r.transactions.id,
      }),
      tags: r.many.tags({
        from: r.entries.id.through(r.entryTags.entryId),
        to: r.tags.id.through(r.entryTags.tagId),
      }),
    },
  }),
);
```

### 11h. `apps/job/src/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { relations } from "./relations";

export function createDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema, relations });
}

export type Database = ReturnType<typeof createDb>;

export * from "./schema";
export { relations } from "./relations";
```

---

## Step 12: Update job app imports

### 12a. `apps/job/src/index.ts`

Change from:
```ts
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { processRecurringTransactions } from "./process-recurring";
import { createDb } from "@expense-tracker/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });   // apps/job/.env.local
config({ path: resolve(__dirname, "../.env") });          // apps/job/.env
config({ path: resolve(__dirname, "../../../.env.local") }); // repo root .env.local
config({ path: resolve(__dirname, "../../../.env") });        // repo root .env
```

To:
```ts
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { processRecurringTransactions } from "./process-recurring";
import { createDb } from "./db";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });   // apps/job/.env.local
config({ path: resolve(__dirname, "../.env") });          // apps/job/.env
```

**Changes:** (1) Import `createDb` from `./db` instead of `@expense-tracker/db`. (2) Remove the two repo root `.env` lines.

### 12b. `apps/job/src/process-recurring.ts:1-8`

Change from:
```ts
import {
  type Database,
  recurring,
  products,
  transactions,
  entries,
} from "@expense-tracker/db";
```

To:
```ts
import type { Database } from "./db";
import { recurring } from "./db/schemas/recurring.schema";
import { products } from "./db/schemas/products.schema";
import { transactions, entries } from "./db/schemas/transactions.schema";
```

---

## Step 13: Remove `@expense-tracker/db` from both `package.json` files

### 13a. `apps/web/package.json:21`

Remove line:
```json
"@expense-tracker/db": "workspace:*",
```

### 13b. `apps/job/package.json:11`

Remove line:
```json
"@expense-tracker/db": "workspace:*",
```

Also add `drizzle-kit` to job's dependencies if it needs schema generation (currently it doesn't — skip).

---

## Step 14: Update `pnpm-workspace.yaml`

**File:** `pnpm-workspace.yaml`

Change from:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

To:
```yaml
packages:
  - "apps/*"
```

---

## Step 15: Delete `packages/` directory

```bash
rm -rf packages/
```

---

## Step 16: Run `pnpm install` to update lockfile

```bash
pnpm install
```

---

## Step 17: Verify

1. `pnpm --filter @expense-tracker/web build` — should compile without errors
2. `pnpm --filter @expense-tracker/job build` — should compile without errors
3. `cd apps/web && pnpm db:generate` — drizzle-kit should find schema at new path
4. `cd apps/web && pnpm db:studio` — should work with new schema path
5. Run the job: `pnpm --filter @expense-tracker/job start`

---

## Execution Order Summary

| # | Action | Files touched |
|---|--------|---------------|
| 1 | Replace 5 feature schema files with real implementations | 5 files modified |
| 2 | Rewrite `apps/web/src/lib/db/schema.ts` | 1 file |
| 3 | Rewrite `apps/web/src/lib/db/relations.ts` | 1 file |
| 4 | Rewrite `apps/web/src/lib/db/index.ts` | 1 file |
| 5 | Fix `transactions.models.ts` import | 1 file |
| 6 | Update `drizzle.config.ts` (schema path + env) | 1 file |
| 7 | Update `server-plugins/env.ts` (remove repo root fallback) | 1 file |
| 8 | Update `reset.ts` (app-local env) | 1 file |
| 9 | Update `seed.ts` (app-local env) | 1 file |
| 10 | Update `list-users.ts` (app-local env) | 1 file |
| 11 | Create `apps/job/src/db/` (5 schemas + schema.ts + relations.ts + index.ts) | 8 new files |
| 12 | Update job app imports (`index.ts` + `process-recurring.ts`) | 2 files |
| 13 | Remove dep from both `package.json` | 2 files |
| 14 | Update `pnpm-workspace.yaml` | 1 file |
| 15 | Delete `packages/` | Directory removal |
| 16 | Run `pnpm install` | lockfile |
| 17 | Verify builds | — |

**Total: 8 new files, 19 modified files, 1 directory deleted**
