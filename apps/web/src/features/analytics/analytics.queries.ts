import { queryOptions } from "@tanstack/react-query";
import { analyticsController } from "./analytics.controller";

export const ANALYTICS_PREFERENCES_QUERY_KEY = "analytics-preferences";

function getPreferencesOptions() {
  return queryOptions({
    queryKey: [ANALYTICS_PREFERENCES_QUERY_KEY],
    queryFn: analyticsController.getPreferences,
  });
}

export const analyticsQueries = {
  getPreferencesOptions,
};
