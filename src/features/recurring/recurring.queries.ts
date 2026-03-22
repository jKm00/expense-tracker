import { queryOptions } from "@tanstack/react-query";
import { recurringController } from "./recurring.controller";

export const RECURRING_QUERY_KEY = "recurring";

function getRecurringProductsOptions() {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY],
    queryFn: () => recurringController.getAllRecurringProducts(),
  });
}

function getRecurringProductOptions(id: string) {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY, id],
    queryFn: () =>
      recurringController.getRecurringProduct({
        data: { id },
      }),
  });
}

export const recurringQueries = {
  getRecurringProductsOptions,
  getRecurringProductOptions,
};
