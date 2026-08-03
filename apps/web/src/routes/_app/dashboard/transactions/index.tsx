import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { MonthSelect } from "@/components/custom/month-select";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { SkeletonCard } from "@/components/custom/skeletons/skeleton-card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, Layers, Plus, TrendingUp } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionKpisOptions(deps.year, deps.month),
      ),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(deps.year, deps.month),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4">
        <PageHeader>
          <PageHeaderTitle>Transactions</PageHeaderTitle>
          <PageHeaderDescription>
            Track your income and expenses
          </PageHeaderDescription>
          <PageHeaderActions>
            <Button asChild size="sm">
              <Link to="/dashboard/transactions/new">
                <Plus className="size-4" />
                <span className="max-md:sr-only">New transaction</span>
              </Link>
            </Button>
          </PageHeaderActions>
        </PageHeader>
        <MonthSelect
          from="/_app/dashboard/transactions/"
          to="/dashboard/transactions/"
        />
      </div>
      <Suspense fallback={<TransactionsContentSkeleton />}>
        <TransactionsContent />
      </Suspense>
    </div>
  );
}

function TransactionsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList rows={5} />
    </div>
  );
}

function TransactionsContent() {
  const { year, month } = Route.useSearch();
  const {
    data: [expectedError, kpis],
    error: unexpectedError,
  } = useSuspenseQuery(transactionQueries.getTransactionKpisOptions(year, month));
  const {
    data: [listExpectedError, transactions],
    error: listUnexpectedError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(year, month));

  if (unexpectedError || listUnexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError || listExpectedError) {
    let title: string;
    let message: string;

    const reason = (expectedError || listExpectedError)!.reason;
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
    <div className="space-y-6 @container">
      <div className="grid gap-3 @xl:grid-cols-2 @2xl:grid-cols-3">
        <KpiCard
          title="Transactions"
          value={`${kpis.count}`}
          subtitle="This month"
          icon={ArrowLeftRight}
        />
        <KpiCard
          title="Per day"
          value={`${kpis.averagePerDay}`}
          subtitle="Average per day"
          icon={TrendingUp}
        />
        <div className="@xl:col-span-2 @2xl:col-span-1">
          <KpiCard
            title="Items"
            value={`${kpis.averageItemsPerTransaction}`}
            subtitle="Average per transaction"
            icon={Layers}
          />
        </div>
      </div>
      <TransactionList transactions={transactions ?? []} />
    </div>
  );
}
