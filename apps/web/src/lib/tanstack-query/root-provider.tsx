import { QueryClient } from "@tanstack/react-query";

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
