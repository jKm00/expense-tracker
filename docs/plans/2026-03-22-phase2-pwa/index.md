# Phase 2: PWA Support Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Add Progressive Web App capabilities so the expense tracker can be installed on mobile devices, persists query data for offline reads, and shows an offline indicator with mutation guards.

**Architecture:** Three layers of PWA support: (1) `vite-plugin-pwa` with `generateSW` strategy auto-generates a service worker that precaches the app shell with CacheFirst for static assets — no custom `src/service-worker.ts` file needed, and no caching of `/_server` POST requests, (2) `@tanstack/react-query-persist-client` persists the TanStack Query cache to `localStorage` so cached data survives reloads, (3) a `useOnlineStatus` hook drives an offline banner (with stale-cache indicator) and mutation guards that prevent writes while offline. A `ReloadPrompt` component uses `virtual:pwa-register/react` to show an "Update available" toast via Sonner when a new service worker is detected. The manifest sets `start_url: "/dashboard"` so PWA users land directly on the dashboard, bypassing the marketing landing page.

**Tech Stack:** vite-plugin-pwa, @tanstack/react-query-persist-client, @tanstack/query-sync-storage-persister, TanStack Start, TanStack Query, React 19, sonner (toasts)

**Design Document:** `docs/design/2026-03-22-expense-tracker-todos-design.md` (Phase 2 section, lines 358–514)

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Install PWA dependencies | Add `vite-plugin-pwa`, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister` | batch-01 |
| 2 | PWA icons | Create `public/icons/` directory with 192x192, 512x512, and apple-touch-icon PNGs | batch-01 |
| 3 | PWA manifest | Replace `public/manifest.json` with expense tracker config | batch-01 |
| 4 | Vite PWA plugin config + type declarations | Configure `vite-plugin-pwa` in `vite.config.ts` with `generateSW`, CacheFirst for static assets, deny `/_server`; add `virtual:pwa-register` types | batch-01 |
| 5 | Query persister | Create `src/lib/tanstack-query/persister.ts` with SSR guard and localStorage size note | batch-02 |
| 6 | PersistQueryClientProvider | Update `src/lib/tanstack-query/root-provider.tsx` to use `PersistQueryClientProvider` | batch-02 |
| 7 | Root meta tags | Update `src/routes/__root.tsx` to add manifest link and PWA meta tags | batch-03 |
| 8 | useOnlineStatus hook + offline banner | Create `src/hooks/use-online-status.ts` and `src/components/custom/offline-banner.tsx` with stale-cache indicator | batch-03 |
| 9 | Wire offline banner into app layout | Add offline banner to `src/routes/_app.tsx` | batch-03 |
| 10 | PWA standalone redirect | Update `src/routes/index.tsx` with standalone detection → redirect to `/dashboard` | batch-03 |
| 11 | SW update prompt | Create `src/components/custom/reload-prompt.tsx` using `useRegisterSW` + Sonner toast for "Update available" | batch-03 |
| 12 | Offline mutation guard utility | Create `src/lib/offline-guard.ts` with `assertOnline()` | batch-04 |
| 13 | Add offline guards to all mutations | Add `assertOnline()` call + `onError` toast to every `mutationFn` in transaction, product, recurring, and tag mutations | batch-04 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3, 4 | — |
| batch-02 | 5, 6 | batch-01 |
| batch-03 | 7, 8, 9, 10, 11 | batch-01 |
| batch-04 | 12, 13 | — |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: Tasks 1–4 are sequential (install deps first, then icons/manifest, then vite config)
- batch-02 and batch-03 are **independent of each other** — both depend only on batch-01, so they can run in parallel after batch-01 completes
- batch-04 has **no dependencies** on any other batch — it uses only native APIs (`navigator.onLine`) and `sonner` (already installed). Can run in parallel with batch-02 and batch-03 after batch-01 completes, or even independently.
- Within batch-03: Tasks 7, 8, 10 are independent and can run in parallel. Task 9 depends on Task 8. Task 11 depends on Task 4 (vite-plugin-pwa config).

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | — |
| 2 | — | — |
| 3 | 2 | — |
| 4 | 1 | — |
| 5 | 1 | 7, 8, 10, 12 |
| 6 | 5 | 7, 8, 9, 10, 11, 12 |
| 7 | 3 | 5, 6, 8, 10, 12, 13 |
| 8 | — | 5, 6, 7, 10, 12 |
| 9 | 8 | 5, 6, 10, 11, 12, 13 |
| 10 | — | 5, 6, 7, 8, 12, 13 |
| 11 | 4 | 5, 6, 9, 10, 12, 13 |
| 12 | — | 5, 6, 7, 8, 9, 10, 11 |
| 13 | 12 | 5, 6, 7, 8, 9, 10, 11 |
