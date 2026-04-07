# Batch 1: Fix dotenv Loading via Nitro Plugin

> **Plan:** Fix Missing Environment Variables at Runtime
> **Goal:** Fix the production build crash caused by `process.env.DATABASE_URL` being `undefined` at runtime.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 1: Move dotenv to dependencies

**Depends on:** Nothing
**Can parallelize with:** Task 2

**Files:**
- Modify: `package.json:17-82` (move dotenv from devDependencies to dependencies)

**Context:** `dotenv` is currently listed in `devDependencies` at line 76 of `package.json`. It needs to be in `dependencies` because:
1. The production server uses it at runtime (via a Nitro plugin that gets bundled into the server output)
2. Nitro declares `dotenv` as an optional peer dependency (`"dotenv": "*"`)
3. It makes the intent clear — this package is needed for production runtime

**Step 1: Move dotenv from devDependencies to dependencies in package.json**

Open `package.json`. Find this line in the `devDependencies` section (around line 76):

```json
    "dotenv": "^16.0.0",
```

Remove it from `devDependencies` and add it to the `dependencies` section. Place it alphabetically — between `"drizzle-kit"` and `"drizzle-orm"`. The `dependencies` section should include:

```json
    "dotenv": "^16.0.0",
    "drizzle-kit": "^1.0.0-beta.18-7eb39f0",
    "drizzle-orm": "^1.0.0-beta.18-7eb39f0",
```

And the `devDependencies` section should no longer contain `dotenv`.

**Step 2: Install updated dependencies**

Run:
```bash
pnpm install
```

Expected: Clean install with no errors. `pnpm-lock.yaml` will be updated to reflect `dotenv` moving from devDependencies to dependencies.

**Step 3: Verify dotenv is in the right section**

Run:
```bash
node -e "const pkg = require('./package.json'); console.log('deps:', !!pkg.dependencies.dotenv, 'devDeps:', !!pkg.devDependencies?.dotenv)"
```

Expected output:
```
deps: true devDeps: false
```

---

## Task 2: Create Nitro env plugin

**Depends on:** Nothing
**Can parallelize with:** Task 1

**Files:**
- Create: `src/server-plugins/env.ts`

**Context:** Nitro supports server plugins via the `plugins` config option (type: `string[]`). During the build, Nitro generates a virtual module (`#nitro/virtual/plugins`) that statically imports each plugin file:

```javascript
// Generated virtual module (conceptual)
import _plugin1 from "./src/server-plugins/env.ts";
export const plugins = [_plugin1];
```

This virtual module is imported by `app.mjs` (the Nitro app core), which in turn is imported by `node-server.mjs` (the production entry). The import chain is:

```
node-server.mjs
  → imports useNitroApp from app.mjs
    → imports plugins from #nitro/virtual/plugins
      → imports our env plugin (static import)
        → MODULE-LEVEL SIDE EFFECTS RUN HERE (dotenv.config())
  → calls useNitroApp() (runs plugin functions)
  → calls serve() (starts listening)
  → first request arrives → loads SSR handler → loads DB module
```

**The key insight:** Module-level side effects in the plugin file execute during the static import phase (step 1 in the production entry), long before any SSR handler or DB module is loaded (which only happens on the first request).

**Step 1: Create the server-plugins directory**

Run:
```bash
mkdir -p src/server-plugins
```

**Step 2: Create `src/server-plugins/env.ts`**

Create the file `src/server-plugins/env.ts` with this exact content:

```typescript
import { config } from "dotenv";
import { definePlugin } from "nitro";

// Load .env files at module initialization time.
// This runs during static imports — BEFORE useNitroApp() is called,
// and BEFORE any SSR handler or DB module is lazily loaded.
config({ path: [".env.local", ".env"] });

export default definePlugin(() => {
  // No-op: dotenv loading is done above at module init time.
  // This plugin exists solely to be registered in Nitro's plugin system,
  // which causes this module to be statically imported at server startup.
});
```

**Why `config({ path: [".env.local", ".env"] })` instead of `import 'dotenv/config'`:**
- `dotenv/config` only loads `.env` by default
- The project's `drizzle.config.ts` uses `config({ path: [".env.local", ".env"] })` — this matches that behavior
- `.env.local` takes precedence for local development overrides (dotenv loads the first file that exists and doesn't override already-set vars)

**Why the plugin function body is empty:**
- The dotenv loading is done as a module-level side effect (the `config()` call at the top)
- Module-level code executes during the static import phase — this is the earliest possible execution point
- The `definePlugin` export is needed so Nitro registers this module in the plugin system (which causes it to be statically imported)

---

## Task 3: Register plugin in vite config

**Depends on:** Task 2
**Can parallelize with:** Nothing

**Files:**
- Modify: `vite.config.ts:32` (add plugins option to nitro() call)

**Context:** The `nitro()` function from `nitro/vite` accepts a `NitroPluginConfig` which extends `NitroConfig`. The `NitroConfig` type includes `plugins: string[]` — an array of file paths to Nitro server plugins.

Currently `vite.config.ts` line 32 has:
```typescript
    nitro(),
```

We need to pass the plugin path so Nitro includes it in the build.

**Step 1: Update the nitro() call in vite.config.ts**

Edit `vite.config.ts`. Change line 32 from:

```typescript
    nitro(),
```

to:

```typescript
    nitro({
      plugins: ["./src/server-plugins/env.ts"],
    }),
```

The full `plugins` array in `vite.config.ts` should now look like:

```typescript
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro({
      plugins: ["./src/server-plugins/env.ts"],
    }),
  ],
```

**Important:** The path `"./src/server-plugins/env.ts"` is relative to the project root. Nitro resolves plugin paths relative to `rootDir` during the build.

---

## Task 4: Verify production build and start

**Depends on:** Task 1, Task 2, Task 3
**Can parallelize with:** Nothing

**Files:**
- None (verification only)

**Context:** The production build compiles the Nitro plugin into the server bundle. When `node .output/server/index.mjs` runs, the plugin module is statically imported, executing `dotenv.config()` before any request handler loads the DB module.

**Step 1: Build the production bundle**

Run:
```bash
pnpm build
```

Expected: Build completes successfully with no errors. Output goes to `.output/` directory. You should see Nitro processing the plugin in the build output.

**Step 2: Verify the plugin is bundled**

Run:
```bash
grep -r "dotenv" .output/server/ --include="*.mjs" -l
```

Expected: At least one `.mjs` file in `.output/server/` should contain dotenv code, confirming it was bundled into the server output.

**Step 3: Start the production server**

Run:
```bash
pnpm start
```

Expected: Server starts without crashing. You should see Nitro's startup message (something like `Listening on http://localhost:3000`). The server should NOT crash with an error about `DATABASE_URL` being undefined or null.

**Note:** If you don't have a running PostgreSQL database with a valid `DATABASE_URL` in `.env`, the server may fail to connect to the database — that's a different error and is expected. The key thing is that it should NOT crash with `process.env.DATABASE_URL` being `undefined`. Look for a database connection error (which means dotenv loaded correctly and passed the URL to Drizzle) rather than a TypeError about undefined.

**Step 4: Verify env loading (optional deeper check)**

If you want to be extra thorough, you can temporarily add a log to verify. Run:
```bash
node -e "require('dotenv').config({ path: ['.env.local', '.env'] }); console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL)"
```

Expected:
```
DATABASE_URL loaded: true
```

(This confirms dotenv loads `.env` correctly in the Node.js runtime.)

**Step 5: Commit the fix**

```bash
git add package.json pnpm-lock.yaml src/server-plugins/env.ts vite.config.ts
git commit -m "fix: load .env via Nitro plugin to fix missing env vars at runtime

Create a Nitro server plugin (src/server-plugins/env.ts) that loads
.env files at module initialization time. Nitro plugins are statically
imported during server startup, ensuring dotenv runs before any SSR
handler or DB module is lazily loaded on the first request.

Move dotenv from devDependencies to dependencies (also satisfies
Nitro's optional peer dependency on dotenv)."
```
