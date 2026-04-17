// src/features/analytics/components/analytics-data-loader.tsx
import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import {
  getComparisonDate,
  filterTransactionsByTags,
} from "@/features/analytics/analytics.utils";
import type { AnalyticsDataLoaderProps } from "@/features/analytics/analytics.models";
import { AnalyticsCalculations } from "./analytics-calculations";

export function AnalyticsDataLoader({
  includeTags,
  excludeTags,
  month: monthParam,
  year: yearParam,
  comparison,
}: AnalyticsDataLoaderProps) {
  const month = monthParam ?? dayjs().month();
  const year = yearParam ?? dayjs().year();

  const {
    data: [expectedTransactionError, transactions],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(yearParam, monthParam));

  const { compareYear, compareMonth } = getComparisonDate(
    yearParam,
    monthParam,
    comparison,
  );
  const {
    data: [, comparisonTransactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(compareYear, compareMonth),
  );

  // Apply tag filters
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

  // ═══════════════════════════════════════════════════════════════════
  // Error handling (unchanged — preserve verbatim including typos)
  // ═══════════════════════════════════════════════════════════════════
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
    <AnalyticsCalculations
      filteredTransactions={filteredTransactions}
      filteredComparisonTransactions={filteredComparisonTransactions}
      month={month}
      year={year}
      compareMonth={compareMonth}
      compareYear={compareYear}
    />
  );
}
