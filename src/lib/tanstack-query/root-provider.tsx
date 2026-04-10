import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  // On the client: use PersistQueryClientProvider to restore/persist the query
  // cache from localStorage for offline support.
  // On the server (SSR): queryPersister is null, so fall back to the standard
  // QueryClientProvider — PersistQueryClientProvider requires a non-null persister.
  if (queryPersister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister }}
      >
        {children}
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
