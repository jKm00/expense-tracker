import { queryOptions } from "@tanstack/react-query";
import { recurringController } from "@/features/recurring/server/recurring.controller";

export const RECURRING_QUERY_KEY = "recurring";

function getRecurringsOptions() {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY],
    queryFn: recurringController.getRecurrings,
  });
}

function getRecurringOptions(recurringId: string) {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY, recurringId],
    queryFn: () =>
      recurringController.getRecurring({ data: { recurringId } }),
  });
}

export const recurringQueries = {
  getRecurringsOptions,
  getRecurringOptions,
};
