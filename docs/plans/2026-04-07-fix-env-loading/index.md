# Fix Missing Environment Variables at Runtime

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Fix the production build crash caused by `process.env.DATABASE_URL` being `undefined` at runtime — the server process never loads the `.env` file.

**Architecture:** Create a Nitro server plugin (`src/server-plugins/env.ts`) that loads `.env` files using `dotenv` at module initialization time. Nitro plugins are statically imported during server startup — their module-level side effects execute *before* `useNitroApp()` initializes, and well before any SSR handler or DB module is lazily loaded on the first request. Register the plugin via `nitro({ plugins: [...] })` in `vite.config.ts`. Move `dotenv` from `devDependencies` to `dependencies` since it's also an optional peer dependency of Nitro.

**Tech Stack:** Node.js, dotenv, Nitro 3.x (`nitro/vite`), Drizzle ORM

---

## Why the Previous Approach Was Wrong

The previous plan added `import 'dotenv/config'` to `src/server.ts`. This **does not work** because:

1. `src/server.ts` does NOT compile into the Nitro entry (`index.mjs`). It compiles into a separate chunk (e.g., `.output/server/_ssr/server-KjXWslRB.mjs`) that is **lazily loaded** when the first request arrives.
2. The DB module (`src/lib/db/index.ts`) is also lazily loaded alongside `src/server.ts` — so `dotenv/config` in `server.ts` provides no guarantee of loading before `process.env.DATABASE_URL` is read.
3. The actual Nitro entry (`index.mjs`) is fully Nitro-generated and does not include any `src/server.ts` code at its top level.

## Why Nitro Plugins Work

The Nitro production entry (`node-server.mjs`) executes in this order:

1. **Static imports** — polyfills, srvx, h3, `useNitroApp` (and `app.mjs` which imports `#nitro/virtual/plugins`)
2. **`useNitroApp()` called at top level** — creates NitroApp, runs plugin functions synchronously
3. **`serve()` called** — server starts listening
4. **First request arrives** → route matching → lazily loads SSR handler → imports `src/server.ts` → imports DB module

Nitro plugins are added to the `#nitro/virtual/plugins` virtual module as **static imports** (step 1). Their module-level side effects (like `dotenv.config()`) run during module initialization, which happens **before** step 2, and long before step 4 where the DB module first reads `process.env.DATABASE_URL`.

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Move dotenv to dependencies | Move `dotenv` from `devDependencies` to `dependencies` in `package.json` | batch-01 |
| 2 | Create Nitro env plugin | Create `src/server-plugins/env.ts` that loads `.env` files at module init time | batch-01 |
| 3 | Register plugin in vite config | Add `plugins` option to `nitro()` call in `vite.config.ts` | batch-01 |
| 4 | Verify production build | Build and start the production server, confirm no env crash | batch-01 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3, 4 | — |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: Tasks 1 and 2 are independent — can run in parallel. Task 3 depends on Task 2 (plugin must exist). Task 4 depends on all prior tasks.

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | 2 |
| 2 | — | 1 |
| 3 | 2 | — |
| 4 | 1, 2, 3 | — |

## Key Codebase Context

**The problem:** `src/lib/db/index.ts` calls `drizzle(process.env.DATABASE_URL!, ...)` at module initialization time (line 6). When the production server starts (`node .output/server/index.mjs`), no dotenv loading has occurred, so `process.env.DATABASE_URL` is `undefined` and the server crashes on first request.

**Why it works in dev:** Nitro's `createNitro()` is called with `{ dotenv: { fileName: [".env", ".env.local"] } }` in dev mode (see `node_modules/nitro/dist/vite.mjs` line 679). In production builds, this dotenv option is not passed.

**Why drizzle-kit works:** `drizzle.config.ts` explicitly loads dotenv with `config({ path: [".env.local", ".env"] })`, but this only runs for `drizzle-kit` CLI commands, not the server process.

**Import alias:** `@/` maps to `./src/` (configured in `tsconfig.json`).

**Server entry:** `src/server.ts` is the SSR entry — it compiles into a lazily-loaded chunk, NOT the main Nitro entry.

**Production entry:** `node .output/server/index.mjs` — this is the Nitro-generated entry based on the `node-server` preset.

**Nitro plugin system:** Plugins listed in `NitroConfig.plugins` (type: `string[]`) are compiled into the `#nitro/virtual/plugins` virtual module as static imports. They execute during server initialization before any request handler.

**dotenv location:** Currently in `devDependencies` at `^16.0.0`. Also an optional peer dependency of Nitro (`"dotenv": "*"`). Must be moved to `dependencies`.
