import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transactions.controller";

export const TRANSACTION_QUERY_KEY = "transactions";
const LIST_STALE_TIME_MS = 1000 * 60 * 5;

function getTransactionsOptions(year?: number, month?: number) {
  return queryOptions({
    queryKey: [TRANSACTION_QUERY_KEY, year, month],
    queryFn: () =>
      transactionController.getTransactions({
        data: {
          year,
          month,
        },
      }),
  });
}

function getTransactionListOptions(year?: number, month?: number) {
  return infiniteQueryOptions({
    queryKey: [TRANSACTION_QUERY_KEY, "list", year, month],
    staleTime: LIST_STALE_TIME_MS,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      transactionController.listTransactions({
        data: {
          year,
          month,
          offset: pageParam,
          limit: 25,
        },
      }),
    getNextPageParam: (lastPage) => {
      const [error, data] = lastPage;
      if (error || !data?.hasMore) {
        return null;
      }

      return data.nextOffset;
    },
  });
}

function getTransactionKpisOptions(year?: number, month?: number) {
  return queryOptions({
    queryKey: [TRANSACTION_QUERY_KEY, "kpis", year, month],
    queryFn: () =>
      transactionController.getTransactionKpis({
        data: {
          year,
          month,
        },
      }),
  });
}

function getTransactionOptions(transactionId: string) {
  return queryOptions({
    queryKey: [TRANSACTION_QUERY_KEY, transactionId],
    queryFn: () =>
      transactionController.getTransaction({ data: { transactionId } }),
  });
}

export const transactionQueries = {
  getTransactionsOptions,
  getTransactionListOptions,
  getTransactionKpisOptions,
  getTransactionOptions,
};
