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
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, Layers, LoaderCircle, Plus, TrendingUp } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionKpisOptions(deps.year, deps.month),
      ),
      context.queryClient.prefetchInfiniteQuery(
        transactionQueries.getTransactionListOptions(deps.year, deps.month),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <PageHeader>
          <PageHeaderTitle>Transactions</PageHeaderTitle>
          <PageHeaderDescription>
            Track your income and expenses
          </PageHeaderDescription>
          <PageHeaderActions>
            <Button asChild size="sm" variant="outline">
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    data: [expectedError, kpis],
    error: unexpectedError,
  } = useSuspenseQuery(transactionQueries.getTransactionKpisOptions(year, month));
  const {
    data: paginatedData,
    error: listUnexpectedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isListPending,
  } = useInfiniteQuery(transactionQueries.getTransactionListOptions(year, month));

  const [listExpectedError, transactionPages] = useMemo(() => {
    if (!paginatedData) {
      return [null, null] as const;
    }

    const firstExpectedError = paginatedData.pages
      .map(([pageError]) => pageError)
      .find(Boolean);

    if (firstExpectedError) {
      return [firstExpectedError, null] as const;
    }

    return [
      null,
      paginatedData.pages
        .map(([, page]) => page)
        .filter(
          (page): page is NonNullable<(typeof paginatedData.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [paginatedData]);

  const visibleTransactions = useMemo(
    () => transactionPages?.flatMap((page) => page.transactions) ?? [],
    [transactionPages],
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage || listExpectedError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, listExpectedError]);

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
      {isListPending ? null : <TransactionList transactions={visibleTransactions} />}
      <div
        ref={loadMoreRef}
        className="flex min-h-10 items-center justify-center"
      >
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading more transactions...
          </div>
        ) : visibleTransactions.length > 0 && !hasNextPage ? (
          <p className="text-sm text-muted-foreground">
            You have reached the end of the transaction list.
          </p>
        ) : null}
      </div>
    </div>
  );
}
