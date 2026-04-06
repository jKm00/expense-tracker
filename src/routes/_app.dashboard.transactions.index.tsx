import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { MonthSelect } from "@/components/custom/month-select";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { transactionUtils } from "@/features/transactions/transactions.utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ArrowLeftRight, Plus, XLineTop } from "lucide-react";
import { Suspense, useMemo } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    await context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.year, deps.month),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <Button asChild className="">
            <Link to="/dashboard/transactions/new">
              <Plus />
              <span className="max-md:sr-only">New transaction</span>
            </Link>
          </Button>
        </div>
        <MonthSelect
          from="/_app/dashboard/transactions/"
          to="/dashboard/transactions/"
        />
      </div>
      <Suspense fallback={<p>TODO: Skeleton</p>}>
        <TransactionsContent />
      </Suspense>
    </div>
  );
}

function TransactionsContent() {
  const { year, month } = Route.useSearch();
  const {
    data: [expectedError, transactions],
    error: unexpectedError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(year, month));

  const averageTransactionsPerDay = useMemo(() => {
    if (!transactions) return 0;

    const total = transactions.length;
    const date =
      year && month
        ? dayjs(new Date(year, month, 1))
        : dayjs().startOf("month");
    const daysInMonth = date.daysInMonth();

    return Math.round((total / daysInMonth) * 100) / 100;
  }, [transactions]);

  const averageItemsPerTransaction = useMemo(() => {
    if (!transactions) return 0;

    const totalTransactions = transactions.length;

    if (totalTransactions === 0) return 0;

    const totalEntries = transactions.reduce(
      (acc, transaction) => acc + transaction.entries.length,
      0,
    );

    return Math.round((totalEntries / totalTransactions) * 100) / 100;
  }, [transactions]);

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "TRANSACTION_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your transactions from the database. Please try again";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
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
    <div className="space-y-8 @container">
      <div className="grid gap-2 @md:grid-cols-3">
        <KpiCard
          title="Transactions"
          value={`${transactions.length}`}
          subtitle="Number of transactions"
          icon={ArrowLeftRight}
        />
        <KpiCard
          title="Transactions / Day"
          value={`${averageTransactionsPerDay}`}
          subtitle="Average transaction per day"
          icon={XLineTop}
        />
        <KpiCard
          title="Items / Transaction"
          value={`${averageItemsPerTransaction}`}
          subtitle="Average items per transactions"
          icon={XLineTop}
        />
      </div>
      <TransactionList transactions={transactions} />
    </div>
  );
}
