import { queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transaction.controller";

export const QUERY_KEY = "transactions";

function getTransactionsOptions(
  month: number | undefined,
  year: number | undefined,
) {
  const usedMonth = month || new Date().getMonth();
  const usedYear = year || new Date().getFullYear();
  return queryOptions({
    queryKey: [QUERY_KEY, usedMonth, usedYear],
    queryFn: async () =>
      await transactionController.getTransactions({
        data: {
          month: usedMonth,
          year: usedYear,
        },
      }),
  });
}

function getTransactionOptions(id: string) {
  return queryOptions({
    queryKey: [QUERY_KEY, id],
    queryFn: () =>
      transactionController.getTransaction({
        data: { id },
      }),
  });
}

export const transactionQueries = {
  getTransactionsOptions,
  getTransactionOptions,
};
