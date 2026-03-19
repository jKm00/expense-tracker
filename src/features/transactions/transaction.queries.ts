import { queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transaction.controller";

export const QUERY_KEY = "transactions";

const getTransactionsOptions = queryOptions({
  queryKey: [QUERY_KEY],
  queryFn: async () => await transactionController.getTransactions(),
});

export const transactionQueries = {
  getTransactionsOptions,
};
