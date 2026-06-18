import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { analyticsQueries } from "@/features/analytics/analytics.queries";
import { productQueries } from "@/features/products/products.queries";
import { tagsQueries } from "@/features/tags/tags.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { getComparisonDate } from "@/features/analytics/analytics.utils";
import { Route } from "@/routes/_app/dashboard/analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";
import dayjs from "dayjs";

export function AnalyticsLoader() {
  const { month, year, comparison } = Route.useSearch();
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
  const { data: preferencesResult } = useQuery(
    analyticsQueries.getPreferencesOptions(),
  );
  const { data: productsResult } = useQuery(productQueries.getProductsOptions());
  const { data: tagsResult } = useQuery(tagsQueries.getTagsOptions());

  const selectedMonth = month || dayjs().month();
  const selectedYear = year || dayjs().year();

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
      transactions={transactions ?? []}
      comparisonTransactions={comparisonTransactions ?? []}
      recurrings={recurrings ?? []}
      analyticsPreferences={preferencesResult?.[1] ?? null}
      products={productsResult?.[1] ?? []}
      tags={tagsResult?.[1] ?? []}
      month={selectedMonth}
      year={selectedYear}
      compareMonth={compareMonth}
      compareYear={compareYear}
    />
  );
}
