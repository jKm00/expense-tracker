import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { integrationController } from "./integration.controller";

export const INTEGRATION_QUERY_KEY = "integration";

function getIntegrationTokensOptions() {
  return queryOptions({
    queryKey: [INTEGRATION_QUERY_KEY, "tokens"],
    queryFn: integrationController.listIntegrationTokens,
  });
}

function getIntegrationRequestLogsOptions(tokenId: string | null) {
  return infiniteQueryOptions({
    queryKey: [INTEGRATION_QUERY_KEY, "request-logs", tokenId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      integrationController.listIntegrationRequestLogs({
        data: {
          tokenId,
          cursor: pageParam,
          limit: 25,
        },
      }),
    getNextPageParam: (lastPage) => {
      const [error, data] = lastPage;
      if (error || !data?.hasMore) {
        return null;
      }

      return data.nextCursor;
    },
  });
}

export const integrationQueries = {
  getIntegrationTokensOptions,
  getIntegrationRequestLogsOptions,
};
