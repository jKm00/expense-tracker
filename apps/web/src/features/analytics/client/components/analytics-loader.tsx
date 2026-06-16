import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tag } from "@/features/tags/shared/tags.models";
import { transactionQueries } from "@/features/transactions/client/transactions.queries";
import { recurringQueries } from "@/features/recurring/client/recurring.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import {
  getComparisonDate,
  filterTransactionsByTags,
} from "@/features/analytics/shared/analytics.utils";
import { AnalyticsDashboard } from "./analytics-dashboard";
import dayjs from "dayjs";

type AnalyticsLoaderProps = {
  includeTags: Tag[];
  excludeTags: Tag[];
  month?: number;
  year?: number;
  comparison?: "year" | "month";
};

export function AnalyticsLoader({
  includeTags,
  excludeTags,
  month,
  year,
  comparison,
}: AnalyticsLoaderProps) {
  const {
    data: [expectedTransactionError, transactions],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(year, month));

  const { compareYear, compareMonth } = getComparisonDate(
    year,
    month,
    comparison,
  );
  const {
    data: [, comparisonTransactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(compareYear, compareMonth),
  );

  const {
    data: [, recurrings],
  } = useSuspenseQuery(
    recurringQueries.getRecurringsOptions(),
  );

  const selectedMonth = month || dayjs().month();
  const selectedYear = year || dayjs().year();

  const filteredTransactions = useMemo(
    () =>
      filterTransactionsByTags(transactions ?? [], includeTags, excludeTags),
    [transactions, includeTags, excludeTags],
  );

  const filteredComparisonTransactions = useMemo(
    () =>
      filterTransactionsByTags(
        comparisonTransactions ?? [],
        includeTags,
        excludeTags,
      ),
    [comparisonTransactions, includeTags, excludeTags],
  );

  if (unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (expectedTransactionError) {
    let title: string;
    let message: string;

    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the databse. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happend: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <AnalyticsDashboard
      transactions={filteredTransactions}
      comparisonTransactions={filteredComparisonTransactions}
      recurrings={recurrings ?? []}
      month={selectedMonth}
      year={selectedYear}
      compareMonth={compareMonth}
      compareYear={compareYear}
    />
  );
}
