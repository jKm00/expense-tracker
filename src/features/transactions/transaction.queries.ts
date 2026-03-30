import { queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transaction.controller";
import dayjs from "dayjs";

export const QUERY_KEY = "transactions";

function getTransactionsOptions(
  month: number | undefined,
  year: number | undefined,
) {
  const date =
    month !== undefined && year !== undefined
      ? dayjs().year(year).month(month).startOf("month")
      : dayjs().startOf("month");
  return queryOptions({
    queryKey: [QUERY_KEY, date.month(), date.year()],
    queryFn: async () =>
      await transactionController.getTransactions({
        data: {
          month: date.month(),
          year: date.year(),
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
