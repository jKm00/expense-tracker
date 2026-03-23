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
