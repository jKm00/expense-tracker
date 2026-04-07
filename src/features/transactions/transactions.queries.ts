import { queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transactions.controller";

export const TRANSACTION_QUERY_KEY = "transactions";

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

function getTransactionOptions(transactionId: string) {
  return queryOptions({
    queryKey: [TRANSACTION_QUERY_KEY, transactionId],
    queryFn: () =>
      transactionController.getTransaction({ data: { transactionId } }),
  });
}

export const transactionQueries = {
  getTransactionsOptions,
  getTransactionOptions,
};
