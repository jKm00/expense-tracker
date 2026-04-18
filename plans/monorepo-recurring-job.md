# Implementation Plan: Monorepo Refactor + Daily Recurring Transactions Job

## 1. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19 + TanStack Router/Start + TanStack React Query |
| Backend | TanStack Start server functions (`createServerFn`) on Nitro |
| Database | PostgreSQL (via docker-compose) |
| ORM | Drizzle ORM v1 beta + drizzle-kit migrations |
| Auth | better-auth (Drizzle adapter) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) |
| Package Manager | pnpm (workspaces) |

## 2. Data Model Context

```
user (id, name, email, ...)
  └── products (id, userId, name, createdAt, updatedAt, deletedAt)
        └── recurring (id, productId, price, interval, type, start, end, isActive, ...)

transactions (id, userId, store, description, source, totalPrice, date, ...)
  └── entries (id, transactionId, productId, price, quantity, type)
        └── entryTags (entryId, tagId)
```

### Key observations for the job:
- `recurring` has NO direct `userId` — the user is resolved via `recurring.productId → products.userId`
- `recurring.interval` is an enum: `"weekly" | "monthly" | "yearly"`
- `recurring.isActive` is the flag to filter on
- `recurring.start` / `recurring.end` define the active date range
- `recurring.type` is an `entry_type` enum: `"income" | "expense"`
- `transactions.source` has a `"recurring"` value — use this for generated transactions
- Each transaction needs at least one entry in the `entries` table

---

## 3. Monorepo Structure (Target)

```
expense-tracker/
├── apps/
│   ├── web/                    ← Current app moved here
│   │   ├── src/                ← All current src/ contents
│   │   ├── public/
│   │   ├── drizzle/            ← Migration files stay with web
│   │   ├── drizzle.config.ts
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── job/                    ← NEW: recurring transactions job
│       ├── src/
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── db/                     ← Shared DB schema, client, relations
│       ├── src/
│       │   ├── index.ts        ← db client export
│       │   ├── schema.ts       ← re-exports all schema files
│       │   ├── relations.ts    ← relation definitions
│       │   └── schemas/
│       │       ├── auth.schema.ts
│       │       ├── products.schema.ts
│       │       ├── recurring.schema.ts
│       │       ├── tags.schema.ts
│       │       └── transactions.schema.ts
│       ├── tsconfig.json
│       └── package.json
├── docker-compose.yml
├── .env
├── .env.example
├── package.json                ← Root workspace config
├── pnpm-workspace.yaml
└── tsconfig.base.json          ← Shared TS config
```

---

## 4. Step-by-Step Implementation

### Phase 1: Set Up pnpm Workspace Root

#### 4.1 Create `pnpm-workspace.yaml` (NEW file at repo root)

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### 4.2 Create root `package.json` (REPLACE current `package.json`)

```json
{
  "name": "expense-tracker",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @expense-tracker/web dev",
    "build": "pnpm --filter @expense-tracker/web build",
    "job": "pnpm --filter @expense-tracker/job start",
    "db:generate": "pnpm --filter @expense-tracker/web db:generate",
    "db:migrate": "pnpm --filter @expense-tracker/web db:migrate",
    "db:push": "pnpm --filter @expense-tracker/web db:push",
    "db:studio": "pnpm --filter @expense-tracker/web db:studio",
    "db:seed": "pnpm --filter @expense-tracker/web db:seed",
    "db:reset": "pnpm --filter @expense-tracker/web db:reset"
  }
}
```

#### 4.3 Create `tsconfig.base.json` (NEW file at repo root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": false,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

---

### Phase 2: Create `packages/db` (Shared Database Package)

#### 4.4 Create `packages/db/package.json`

```json
{
  "name": "@expense-tracker/db",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./relations": "./src/relations.ts"
  },
  "dependencies": {
    "drizzle-orm": "^1.0.0-beta.18-7eb39f0",
    "pg": "^8.16.3",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/pg": "^8.15.6",
    "typescript": "^5.7.2"
  }
}
```

#### 4.5 Create `packages/db/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts"]
}
```

#### 4.6 Create `packages/db/src/schemas/auth.schema.ts`

Copy from `src/features/auth/auth.schema.ts` — **no changes needed** (no `@/` imports).

**Source:** `src/features/auth/auth.schema.ts:1-93`

#### 4.7 Create `packages/db/src/schemas/tags.schema.ts`

Copy from `src/features/tags/tags.schema.ts` — update import path:

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

#### 4.8 Create `packages/db/src/schemas/products.schema.ts`

Copy from `src/features/products/products.schema.ts` — update imports:

```ts
import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
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

#### 4.9 Create `packages/db/src/schemas/transactions.schema.ts`

Copy from `src/features/transactions/transactions.schema.ts` — update imports. **Also move the `entryTypes` constant here** (it's needed by the schema and currently lives in `transactions.models.ts`):

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

#### 4.10 Create `packages/db/src/schemas/recurring.schema.ts`

Copy from `src/features/recurring/recurring.schema.ts` — update imports:

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
});
```

#### 4.11 Create `packages/db/src/schema.ts`

```ts
export * from "./schemas/auth.schema";
export * from "./schemas/products.schema";
export * from "./schemas/recurring.schema";
export * from "./schemas/tags.schema";
export * from "./schemas/transactions.schema";
```

#### 4.12 Create `packages/db/src/relations.ts`

Copy from `src/lib/db/relations.ts:1-117` — update all imports to use relative paths:

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

// ... rest is identical to src/lib/db/relations.ts:17-117
export const relations = defineRelations(
  {
    user, session, account, verification,
    products, recurring, tags, productTags,
    transactions, entries, entryTags,
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
      user: r.one.user({ from: r.session.userId, to: r.user.id }),
    },
    account: {
      user: r.one.user({ from: r.account.userId, to: r.user.id }),
    },
    products: {
      user: r.one.user({ from: r.products.userId, to: r.user.id }),
      recurring: r.many.recurring({ from: r.products.id, to: r.recurring.productId }),
      tags: r.many.tags({
        from: r.products.id.through(r.productTags.productId),
        to: r.tags.id.through(r.productTags.tagId),
      }),
      entries: r.many.entries({ from: r.products.id, to: r.entries.productId }),
    },
    recurring: {
      products: r.one.products({ from: r.recurring.productId, to: r.products.id }),
    },
    tags: {
      user: r.one.user({ from: r.tags.userId, to: r.user.id }),
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
      user: r.one.user({ from: r.transactions.userId, to: r.user.id }),
      entries: r.many.entries({ from: r.transactions.id, to: r.entries.transactionId }),
    },
    entries: {
      products: r.one.products({ from: r.entries.productId, to: r.products.id }),
      transactions: r.one.transactions({ from: r.entries.transactionId, to: r.transactions.id }),
      tags: r.many.tags({
        from: r.entries.id.through(r.entryTags.entryId),
        to: r.tags.id.through(r.entryTags.tagId),
      }),
    },
  }),
);
```

#### 4.13 Create `packages/db/src/index.ts`

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

### Phase 3: Move Web App to `apps/web`

#### 4.14 Move files

Run these commands **in order**:

```bash
mkdir -p apps/web

# Move app source files
mv src apps/web/
mv public apps/web/
mv drizzle apps/web/
mv drizzle.config.ts apps/web/
mv vite.config.ts apps/web/
mv tsconfig.json apps/web/
mv tsconfig.tsbuildinfo apps/web/
mv components.json apps/web/
mv .tanstack apps/web/

# Keep at root: docker-compose.yml, .env, .env.example, .github, .gitignore, pnpm-lock.yaml, docs/, plans/
```

#### 4.15 Create `apps/web/package.json`

```json
{
  "name": "@expense-tracker/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "preview": "vite preview",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/lib/db/seed.ts",
    "db:reset": "tsx src/lib/db/reset.ts",
    "db:list-users": "tsx src/lib/db/list-users.ts"
  },
  "dependencies": {
    "@expense-tracker/db": "workspace:*",
    "@base-ui/react": "^1.3.0",
    "@better-auth/drizzle-adapter": "^1.5.5",
    "@fontsource-variable/geist": "^5.2.8",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-separator": "^1.1.8",
    "@tailwindcss/vite": "^4.0.6",
    "@tanstack/query-core": "5.90.20",
    "@tanstack/query-sync-storage-persister": "5.90.21",
    "@tanstack/react-devtools": "^0.7.0",
    "@tanstack/react-form": "^1.28.5",
    "@tanstack/react-form-devtools": "^0.2.19",
    "@tanstack/react-form-start": "^1.28.5",
    "@tanstack/react-query": "^5.66.5",
    "@tanstack/react-query-devtools": "^5.84.2",
    "@tanstack/react-query-persist-client": "5.90.21",
    "@tanstack/react-router": "^1.132.0",
    "@tanstack/react-router-devtools": "^1.132.0",
    "@tanstack/react-router-ssr-query": "^1.131.7",
    "@tanstack/react-start": "^1.132.0",
    "@tanstack/router-plugin": "^1.132.0",
    "@tanstack/zod-adapter": "^1.166.9",
    "better-auth": "^1.4.12",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "dayjs": "^1.11.20",
    "dotenv": "^16.0.0",
    "drizzle-kit": "^1.0.0-beta.18-7eb39f0",
    "drizzle-orm": "^1.0.0-beta.18-7eb39f0",
    "drizzle-seed": "^0.3.1",
    "lucide-react": "^0.577.0",
    "next-themes": "^0.4.6",
    "nitro": "^3.0.260311-beta",
    "pg": "^8.16.3",
    "radix-ui": "^1.4.3",
    "react": "^19.2.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.72.0",
    "recharts": "3.8.0",
    "shadcn": "^4.1.0",
    "sonner": "^2.0.7",
    "srvx": "^0.11.15",
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^4.0.6",
    "tw-animate-css": "^1.4.0",
    "vite-tsconfig-paths": "^6.0.2",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tanstack/devtools-vite": "^0.3.11",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.2.0",
    "@types/node": "^22.10.2",
    "@types/pg": "^8.15.6",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "jsdom": "^27.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^7.1.7",
    "vitest": "^3.0.5"
  }
}
```

#### 4.16 Update `apps/web/src/lib/db/index.ts`

Replace the current DB client to use the shared package:

```ts
import { createDb } from "@expense-tracker/db";

export const db = createDb(process.env.DATABASE_URL!);
```

#### 4.17 Update `apps/web/src/lib/db/schema.ts`

Replace with a re-export from the shared package:

```ts
export * from "@expense-tracker/db/schema";
```

#### 4.18 Update `apps/web/src/lib/db/relations.ts`

Replace with a re-export from the shared package:

```ts
export { relations } from "@expense-tracker/db/relations";
```

#### 4.19 Update `apps/web/src/features/transactions/transactions.models.ts`

Update the `entryTypes` import to come from the shared package:

```ts
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "@/features/transactions/transactions.schema";
import { Product, ProductWithTag } from "../products/products.models";
import { EntryType } from "@expense-tracker/db/schema";

export const transactionSources = ["manual", "recurring", "scan"] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export { EntryType };
export const entryTypes = ["income", "expense"] as const;

export type Entry = InferSelectModel<typeof entries>;
export type EntryWithProduct = Entry & { product: Product | null };
export type NewEntry = InferInsertModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: ProductWithTag | null;
  })[];
};
```

#### 4.20 Update `apps/web/drizzle.config.ts`

Update the schema path (it now re-exports from the shared package, but drizzle-kit needs to find the actual table definitions):

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

#### 4.21 Update `apps/web/vite.config.ts`

No changes needed — the `@/` alias and `vite-tsconfig-paths` will continue to work since `tsconfig.json` is in `apps/web/`.

#### 4.22 Update `apps/web/src/server-plugins/env.ts`

Update the dotenv path to also look at the root `.env`:

```ts
import { config } from "dotenv";
import { definePlugin } from "nitro";

config({ path: ["../../.env.local", "../../.env", ".env.local", ".env"] });

export default definePlugin(() => {});
```

#### 4.23 Update web schema files to re-export from shared package

Each feature schema file in `apps/web/src/features/*/` should be replaced with a re-export so that existing `@/features/*/schema` imports throughout the web app continue to work without mass-renaming:

**`apps/web/src/features/auth/auth.schema.ts`:**
```ts
export * from "@expense-tracker/db/schema";
// Only re-exports: user, session, account, verification
```

> **Note:** This re-exports everything from the shared schema. Since the web app's existing imports like `import { user } from "@/features/auth/auth.schema"` use named imports, they will continue to resolve correctly. The extra exports are unused and tree-shaken.

Apply the same pattern to:
- `apps/web/src/features/tags/tags.schema.ts` → `export * from "@expense-tracker/db/schema";`
- `apps/web/src/features/products/products.schema.ts` → `export * from "@expense-tracker/db/schema";`
- `apps/web/src/features/transactions/transactions.schema.ts` → `export * from "@expense-tracker/db/schema";`
- `apps/web/src/features/recurring/recurring.schema.ts` → `export * from "@expense-tracker/db/schema";`

---

### Phase 4: Create `apps/job` (Recurring Transactions Job)

#### 4.24 Create `apps/job/package.json`

```json
{
  "name": "@expense-tracker/job",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@expense-tracker/db": "workspace:*",
    "date-fns": "^4.1.0",
    "dotenv": "^16.0.0",
    "drizzle-orm": "^1.0.0-beta.18-7eb39f0",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/pg": "^8.15.6",
    "tsx": "^4.0.0",
    "typescript": "^5.7.2"
  }
}
```

#### 4.25 Create `apps/job/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts"]
}
```

#### 4.26 Create `apps/job/src/index.ts` — Main Entry Point

```ts
import "dotenv/config";
import { processRecurringTransactions } from "./process-recurring";
import { createDb } from "@expense-tracker/db";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);
  const today = new Date();

  console.log(`[recurring-job] Starting for date: ${today.toISOString().split("T")[0]}`);

  try {
    const result = await processRecurringTransactions(db, today);
    console.log(`[recurring-job] Done. Created ${result.created} transactions, skipped ${result.skipped}.`);
    process.exit(0);
  } catch (error) {
    console.error("[recurring-job] Fatal error:", error);
    process.exit(1);
  }
}

main();
```

#### 4.27 Create `apps/job/src/process-recurring.ts` — Core Job Logic

```ts
import { and, eq, lte, or, isNull } from "drizzle-orm";
import {
  type Database,
  recurring,
  products,
  transactions,
  entries,
} from "@expense-tracker/db";
import {
  startOfDay,
  getDay,
  getDate,
  getMonth,
  getDayOfYear,
} from "date-fns";

interface ProcessResult {
  created: number;
  skipped: number;
}

/**
 * Determines if a recurring transaction should fire on the given date
 * based on its interval and start date.
 *
 * - weekly:  fires on the same day-of-week as `start`
 * - monthly: fires on the same day-of-month as `start`
 *            (if start is 31st and month has 30 days, fires on 30th)
 * - yearly:  fires on the same month AND day-of-month as `start`
 */
export function shouldFireOnDate(
  interval: "weekly" | "monthly" | "yearly",
  start: Date,
  today: Date,
): boolean {
  switch (interval) {
    case "weekly":
      // getDay: 0=Sun, 1=Mon, ..., 6=Sat
      return getDay(today) === getDay(start);

    case "monthly": {
      const startDay = getDate(start);
      const todayDay = getDate(today);
      // Handle months with fewer days (e.g., start=31, today is in a 30-day month)
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      if (startDay > lastDayOfMonth) {
        return todayDay === lastDayOfMonth;
      }
      return todayDay === startDay;
    }

    case "yearly":
      return (
        getMonth(today) === getMonth(start) &&
        getDate(today) === getDate(start)
      );
  }
}

/**
 * Fetches all active recurring transactions that are eligible to fire today,
 * then creates a transaction + entry for each one.
 *
 * A recurring transaction is eligible if:
 * 1. isActive === true
 * 2. start <= today
 * 3. end is null OR end >= today
 * 4. The interval matches today's date (see shouldFireOnDate)
 */
export async function processRecurringTransactions(
  db: Database,
  today: Date,
): Promise<ProcessResult> {
  const todayStart = startOfDay(today);

  // Fetch all active recurring transactions where start <= today and (end is null or end >= today)
  // Join with products to get the userId
  const activeRecurring = await db
    .select({
      recurring: recurring,
      userId: products.userId,
      productName: products.name,
    })
    .from(recurring)
    .innerJoin(products, eq(recurring.productId, products.id))
    .where(
      and(
        eq(recurring.isActive, true),
        lte(recurring.start, todayStart),
        or(isNull(recurring.end), lte(todayStart, recurring.end!)),
      ),
    );

  let created = 0;
  let skipped = 0;

  for (const row of activeRecurring) {
    const rec = row.recurring;

    // Check if this recurring transaction should fire today
    if (!shouldFireOnDate(rec.interval, rec.start, todayStart)) {
      skipped++;
      continue;
    }

    // Create the transaction and entry in a single DB transaction
    await db.transaction(async (tx) => {
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          userId: row.userId,
          source: "recurring",
          description: `Recurring: ${row.productName}`,
          totalPrice: rec.price,
          date: todayStart,
        })
        .returning({ id: transactions.id });

      await tx.insert(entries).values({
        transactionId: newTransaction.id,
        productId: rec.productId,
        price: rec.price,
        quantity: 1,
        type: rec.type,
      });
    });

    created++;
    console.log(
      `[recurring-job] Created transaction for recurring "${row.productName}" (${rec.interval}, ${rec.type}, $${rec.price}) for user ${row.userId}`,
    );
  }

  return { created, skipped };
}
```

---

### Phase 5: Final Cleanup & Verification

#### 4.28 Delete old root files that were moved

```bash
rm -f tsconfig.tsbuildinfo
# The old package.json is replaced in step 4.2
# The old tsconfig.json is moved in step 4.14
```

#### 4.29 Install dependencies

```bash
pnpm install
```

#### 4.30 Verify the web app works

```bash
pnpm dev
# Should start on port 3000 as before
```

#### 4.31 Test the job

```bash
pnpm job
# Or: pnpm --filter @expense-tracker/job start
```

---

## 5. Commands Reference

| Command | Description |
|---|---|
| `pnpm dev` | Start web app dev server (port 3000) |
| `pnpm build` | Build web app for production |
| `pnpm job` | Run recurring transactions job once |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database |
| `pnpm db:reset` | Reset database |

---

## 6. Key Design Decisions

1. **Schema lives in `packages/db`** — single source of truth for both web and job. No schema duplication.
2. **`createDb()` factory function** — each consumer creates its own DB instance with its own connection, avoiding shared global state.
3. **Web schema files become re-exports** — all existing `@/features/*/schema` imports in the web app continue to work without mass-renaming hundreds of import statements.
4. **Job is a simple `tsx` script** — no framework overhead. Runs once, exits. Perfect for cron/external scheduler.
5. **`shouldFireOnDate` handles edge cases** — monthly recurring on the 31st fires on the last day of shorter months.
6. **`.env` stays at root** — both apps read from `../../.env` so there's one source of truth for `DATABASE_URL`.
7. **No scheduling in the job** — it's designed to be triggered externally (cron, GitHub Actions, etc.) once per day.
