# Batch 2: TanStack Query Persistence

> **Plan:** Phase 2: PWA Support
> **Goal:** Add Progressive Web App capabilities so the expense tracker can be installed on mobile devices, persists query data for offline reads, and shows an offline indicator with mutation guards.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 5: Query persister

**Depends on:** Task 1 (packages must be installed)
**Can parallelize with:** Nothing

**Files:**
- Create: `src/lib/tanstack-query/persister.ts`

**Context:** TanStack Query's `createSyncStoragePersister` writes the entire query cache to `localStorage` so that cached data survives page reloads and offline app launches. This must be guarded for SSR because `window.localStorage` doesn't exist during server-side rendering in TanStack Start. The persister is `null` on the server — the `PersistQueryClientProvider` (Task 6) handles this gracefully by acting as a regular `QueryClientProvider` when no persister is provided.

> **localStorage size limit:** `localStorage` is capped at ~5–10 MB depending on browser. For this app's query cache (expense lists, product catalogs) this is more than sufficient. If the cache ever grows too large (e.g., storing large blobs or images), the upgrade path is to switch to `@tanstack/query-async-storage-persister` with `idb-keyval` for IndexedDB-backed persistence — same API shape, just async.

**Step 1: Create the persister module**

Create `src/lib/tanstack-query/persister.ts`:

```ts
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Guard for SSR: window.localStorage doesn't exist during server-side rendering
// in TanStack Start. The persister must only be created on the client.
// When null, PersistQueryClientProvider behaves as a regular QueryClientProvider.
//
// localStorage is capped at ~5-10MB depending on browser, which is sufficient
// for this app's query cache. If cache size becomes an issue, swap to
// @tanstack/query-async-storage-persister + idb-keyval for IndexedDB storage.
export const queryPersister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({ storage: window.localStorage })
    : null;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors from `src/lib/tanstack-query/persister.ts`.

**Step 3: Commit**

```bash
git add src/lib/tanstack-query/persister.ts
git commit -m "feat(pwa): create TanStack Query localStorage persister with SSR guard"
```

---

## Task 6: PersistQueryClientProvider

**Depends on:** Task 5 (persister module must exist)
**Can parallelize with:** Nothing

**Files:**
- Modify: `src/lib/tanstack-query/root-provider.tsx`

**Context:** The current `root-provider.tsx` exports a `Provider` component that wraps children in `QueryClientProvider`. We need to swap it to use `PersistQueryClientProvider` from `@tanstack/react-query-persist-client`. This component is a drop-in replacement that additionally restores cached query data from `localStorage` on mount and persists it on changes.

> **Why `root-provider.tsx` and not `router.tsx`?** The design document references `router.tsx` as the integration point, but that's incorrect for this codebase. In this project, `router.tsx` only calls `TanstackQuery.getContext()` to obtain the `queryClient` and passes it into the router context — it never renders a `QueryClientProvider`. The actual `QueryClientProvider` rendering lives in `src/lib/tanstack-query/root-provider.tsx`, which exports the `Provider` component. This is the correct (and only) place to swap in `PersistQueryClientProvider`.

The `QueryClient` also needs a `gcTime` of 24 hours so persisted data isn't garbage-collected too quickly. The default `gcTime` is 5 minutes — if we don't increase it, the cache would be emptied before it's useful for offline scenarios.

The current `src/lib/tanstack-query/root-provider.tsx` looks like:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient()
  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

**Step 1: Update root-provider.tsx**

Replace the entire contents of `src/lib/tanstack-query/root-provider.tsx` with:

```tsx
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryPersister } from "./persister";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep cached data for 24 hours so it survives page reloads
        // and is available when the app launches offline.
        gcTime: ONE_DAY_MS,
      },
    },
  });
  return {
    queryClient,
  };
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={
        queryPersister ? { persister: queryPersister } : undefined
      }
    >
      {children}
    </PersistQueryClientProvider>
  );
}
```

**What changed:**
1. Replaced `QueryClientProvider` import with `PersistQueryClientProvider` from `@tanstack/react-query-persist-client`
2. Imported `queryPersister` from `./persister`
3. Added `gcTime: ONE_DAY_MS` to `QueryClient` default options so cached data isn't garbage-collected too quickly
4. `PersistQueryClientProvider` receives `persistOptions` only when the persister exists (client-side). On the server (where `queryPersister` is `null`), `persistOptions` is `undefined` and it behaves like a regular `QueryClientProvider`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new TypeScript errors.

**Step 3: Verify the dev server starts and loads correctly**

Run: `npm run dev`

1. Open `http://localhost:3000` in the browser
2. Log in and navigate to the dashboard
3. Open DevTools → Application → Local Storage → `http://localhost:3000`
4. You should see a key like `REACT_QUERY_OFFLINE_CACHE` (the default key used by `createSyncStoragePersister`)
5. The value should be a JSON blob containing your cached query data

Press `Ctrl+C` to stop the dev server.

**Step 4: Commit**

```bash
git add src/lib/tanstack-query/root-provider.tsx
git commit -m "feat(pwa): use PersistQueryClientProvider with 24h gcTime for offline cache"
```

**Done when:** The app loads normally, queries are cached in `localStorage`, and the cache survives a page reload (data appears instantly before revalidation).
