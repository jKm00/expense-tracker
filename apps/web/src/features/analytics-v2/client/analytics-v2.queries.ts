import { queryOptions } from "@tanstack/react-query";
import { getDashboardData } from "@/features/analytics-v2/server/analytics-v2.controller";

const ANALYTICS_V2_QUERY_KEY = "analytics-v2";

export function getDashboardDataOptions(
  year?: number,
  month?: number,
  tagIds?: string[],
) {
  return queryOptions({
    queryKey: [ANALYTICS_V2_QUERY_KEY, "dashboard", year, month, tagIds],
    queryFn: () => getDashboardData({ data: { year, month, tagIds } }),
  });
}
