import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { automationController } from "./automation.controller";

export const AUTOMATION_QUERY_KEY = "automation";

function getAutomationTokensOptions() {
  return queryOptions({
    queryKey: [AUTOMATION_QUERY_KEY, "tokens"],
    queryFn: automationController.listAutomationTokens,
  });
}

function getAutomationRequestLogsOptions(tokenId: string | null) {
  return infiniteQueryOptions({
    queryKey: [AUTOMATION_QUERY_KEY, "request-logs", tokenId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      automationController.listAutomationRequestLogs({
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

export const automationQueries = {
  getAutomationTokensOptions,
  getAutomationRequestLogsOptions,
};
