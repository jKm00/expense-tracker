# Batch 1: PWA Infrastructure

> **Plan:** Phase 2: PWA Support
> **Goal:** Add Progressive Web App capabilities so the expense tracker can be installed on mobile devices, persists query data for offline reads, and shows an offline indicator with mutation guards.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 1: Install PWA dependencies

**Depends on:** Nothing
**Can parallelize with:** Nothing

**Files:**
- Modify: `package.json`

**Context:** We need three new packages: `vite-plugin-pwa` for service worker generation, `@tanstack/react-query-persist-client` for the `PersistQueryClientProvider` React component, and `@tanstack/query-sync-storage-persister` for the `createSyncStoragePersister` factory that writes TanStack Query cache to `localStorage`.

**Step 1: Install the dependencies**

Run:
```bash
npm install vite-plugin-pwa @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

Expected: All three packages install without errors. `package.json` should now list them in `dependencies`.

**Step 2: Verify installation**

Run: `npx tsc --noEmit`
Expected: No new TypeScript errors (existing errors may remain — that's fine, just no new ones).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install vite-plugin-pwa and TanStack Query persist packages"
```

---

## Task 2: PWA icons

**Depends on:** Nothing
**Can parallelize with:** Nothing

**Files:**
- Create: `public/icons/icon-192x192.png`
- Create: `public/icons/icon-512x512.png`
- Create: `public/icons/apple-touch-icon.png`

**Context:** PWA manifests require icon files at specific sizes. The project already has `public/logo192.png` and `public/logo512.png` (TanStack default logos). We'll create a `public/icons/` directory and copy the existing logos as starting icons. The apple-touch-icon is sourced from the 192x192 file — the manifest will declare it at its actual size (192x192), not 180x180.

**Step 1: Create the icons directory and copy existing logos**

```bash
mkdir -p public/icons
cp public/logo192.png public/icons/icon-192x192.png
cp public/logo512.png public/icons/icon-512x512.png
cp public/logo192.png public/icons/apple-touch-icon.png
```

> **Note:** These are placeholder icons from the TanStack starter template. Replace them with actual app icons (e.g., using [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/)) before shipping to production.

**Step 2: Verify files exist**

Run: `ls -la public/icons/`
Expected:
```
icon-192x192.png
icon-512x512.png
apple-touch-icon.png
```

**Step 3: Commit**

```bash
git add public/icons/
git commit -m "chore: add PWA icon assets to public/icons/"
```

---

## Task 3: PWA manifest

**Depends on:** Task 2 (icons must exist at the paths referenced in manifest)
**Can parallelize with:** Nothing

**Files:**
- Modify: `public/manifest.json`

**Context:** The existing `public/manifest.json` is the TanStack starter default. Replace it entirely with the expense tracker PWA config from the design doc. Key decisions: `start_url: "/dashboard"` so PWA users land directly on the dashboard (the `/_app` auth guard handles unauthenticated users by redirecting to `/login`). Dark theme colors (`#0a0a0a`) to match the upcoming Phase 3 dark-mode-first redesign.

**Step 1: Replace manifest.json**

Replace the entire contents of `public/manifest.json` with:

```json
{
  "name": "JKM Expense Tracker",
  "short_name": "Expenses",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/apple-touch-icon.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

> **Note:** The apple-touch-icon `sizes` is declared as `192x192` to match the actual source file dimensions. iOS handles resizing to its preferred 180x180 automatically.

**Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "feat(pwa): update manifest with expense tracker config and dashboard start_url"
```

---

## Task 4: Vite PWA plugin config + type declarations

**Depends on:** Task 1 (vite-plugin-pwa must be installed)
**Can parallelize with:** Nothing

**Files:**
- Modify: `vite.config.ts`
- Create: `src/pwa.d.ts`

**Context:** `vite-plugin-pwa` supports two strategies: `generateSW` (default) and `injectManifest`. We use `generateSW` — the plugin auto-generates the service worker using Workbox, so **no custom `src/service-worker.ts` file is needed**. The design doc's Component Architecture lists `src/service-worker.ts` as a new file, but with `generateSW` strategy, Workbox handles everything based on the config below. This is the simpler approach and matches our needs (static asset precaching + no `/_server` caching).

Configuration details:
- `strategies: 'generateSW'` (explicit, though it's the default) — Workbox auto-generates the SW
- `registerType: 'prompt'` — exposes `needRefresh` state via `virtual:pwa-register/react` so we can show an "Update available" toast (Task 11)
- `workbox.globPatterns` — precache all static assets (JS, CSS, HTML, images, fonts)
- `workbox.navigateFallbackDenylist` — exclude `/_server` routes from SW interception (TanStack Start server functions use POST to `/_server/*`, and Workbox can't cache POST requests)
- `manifest: false` — tells the plugin we provide our own `public/manifest.json` (it won't generate one)
- The `VitePWA` plugin is placed **before** `tanstackStart()` in the plugins array

We also need a TypeScript declaration file for the `virtual:pwa-register/react` module, which is a virtual module provided by the plugin at build time.

The current `vite.config.ts` looks like:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
```

**Step 1: Update vite.config.ts**

Replace the entire contents of `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    VitePWA({
      // generateSW: Workbox auto-generates the service worker.
      // No custom src/service-worker.ts file needed.
      strategies: 'generateSW',
      // 'prompt': exposes needRefresh via virtual:pwa-register/react
      // so we can show an "Update available" toast (see ReloadPrompt component).
      registerType: 'prompt',
      // We provide our own public/manifest.json — don't generate one.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Exclude TanStack Start server function calls from SW interception.
        // Server functions use POST to /_server/* which Workbox can't cache.
        navigateFallbackDenylist: [/^\/_server/],
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
```

**What changed:**
1. Added `import { VitePWA } from 'vite-plugin-pwa'`
2. Added `VitePWA({ ... })` plugin call before `tanstackStart()`
3. `strategies: 'generateSW'` — explicit that Workbox generates the SW (no custom file)
4. `registerType: 'prompt'` — enables the update prompt flow
5. `manifest: false` — we provide our own `public/manifest.json`
6. `globPatterns` — precaches all static assets including fonts
7. `navigateFallbackDenylist: [/^\/_server/]` — prevents SW from intercepting server function calls

**Step 2: Create TypeScript type declaration for virtual:pwa-register**

Create `src/pwa.d.ts`:

```ts
/// <reference types="vite-plugin-pwa/client" />
```

This single line pulls in the type definitions for `virtual:pwa-register` and `virtual:pwa-register/react` modules that the plugin provides at build time.

**Step 3: Verify the dev server starts**

Run: `npm run dev`
Expected: Dev server starts on port 3000 without errors. You may see a Workbox-related log in the console — that's expected.

Press `Ctrl+C` to stop the dev server.

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new TypeScript errors from `vite.config.ts`.

**Step 5: Commit**

```bash
git add vite.config.ts src/pwa.d.ts
git commit -m "feat(pwa): configure vite-plugin-pwa with generateSW strategy and add type declarations"
```

**Done when:** `vite.config.ts` includes the `VitePWA` plugin with `generateSW` strategy, `src/pwa.d.ts` provides types for `virtual:pwa-register/react`, dev server starts cleanly, and `/_server` routes are excluded from service worker interception.
