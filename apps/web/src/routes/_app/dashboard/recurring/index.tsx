import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { SkeletonCard } from "@/components/custom/skeletons/skeleton-card";
import { Button } from "@/components/ui/button";
import {
  RecurringList,
  RecurringListEmpty,
  RecurringListTitle,
} from "@/features/recurring/components/recurring-list";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { calculateFixedTotalsFromRecurrings } from "@/features/analytics/analytics.calculations";
import { formatAmount } from "@/utils/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Repeat, Plus, Pause, Play } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      recurringQueries.getRecurringsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderTitle>Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Track recurring expenses and subscriptions
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/recurring/new">
              <Plus className="size-4" />
              <span className="max-md:sr-only">New recurring</span>
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<RecurringContentSkeleton />}>
        <RecurringContent />
      </Suspense>
    </div>
  );
}

function RecurringContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}

function RecurringContent() {
  const [search, setSearch] = useState("");

  const {
    data: [expectedError, items],
    error: unexpectedError,
  } = useSuspenseQuery(recurringQueries.getRecurringsOptions());

  const sortedItems = useMemo(() => {
    if (!items) return [];
    return items.sort((a, b) => Number(b.price) - Number(a.price));
  }, [items]);

  const { activeItems, pausedItems } = useMemo(() => {
    if (!sortedItems) return { activeItems: [], pausedItems: [] };

    const activeItems: RecurringWithProduct[] = [];
    const pausedItems: RecurringWithProduct[] = [];

    sortedItems.forEach((item) => {
      if (item.isActive) {
        activeItems.push(item);
      } else {
        pausedItems.push(item);
      }
    });

    return { activeItems, pausedItems };
  }, [sortedItems]);

  const fixedTotals = useMemo(() => {
    return calculateFixedTotalsFromRecurrings(items ?? []);
  }, [items]);

  const filteredActiveItems = useMemo(() => {
    return activeItems.filter((i) =>
      i.products?.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [activeItems, search]);

  const filteredPausedItems = useMemo(() => {
    return pausedItems.filter((i) =>
      i.products?.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [pausedItems, search]);

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "RECURRING_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your recurring transactions. Please try again!";
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
      <div className="grid gap-3 @lg:grid-cols-2 @xl:grid-cols-4">
        <KpiCard
          title="Recurring income"
          value={formatAmount(fixedTotals.fixedIncome)}
          subtitle="Monthly (active)"
          icon={Repeat}
          color="income"
        />

        <KpiCard
          title="Recurring spend"
          value={formatAmount(fixedTotals.fixedExpenses)}
          subtitle="Monthly (active)"
          icon={Repeat}
          color="expense"
        />

        <KpiCard
          title="Total"
          value={`${items.length}`}
          subtitle="All recurring"
          icon={Repeat}
        />

        <KpiCard
          title="Active"
          value={`${activeItems.length}`}
          subtitle="Currently running"
          icon={Play}
        />
      </div>
      <Input
        aria-label="Search recurring entries"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {items.length === 0 && !search ? (
        <EmptyState icon={Repeat}>
          <EmptyStateMessage>
            You do not have any recurring entries yet. Add one to keep fixed
            income and expenses on track.
          </EmptyStateMessage>
          <EmptyStateAction>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/recurring/new">
                <Plus className="size-4" />
                Create recurring entry
              </Link>
            </Button>
          </EmptyStateAction>
        </EmptyState>
      ) : (
        <>
      <RecurringList items={filteredActiveItems}>
        <RecurringListTitle>Active</RecurringListTitle>
        <RecurringListEmpty>
          {search
            ? "No active recurring entries match your search"
            : pausedItems.length > 0
              ? "No active recurring entries right now. Everything is currently paused."
              : "No active recurring entries yet"}
        </RecurringListEmpty>
      </RecurringList>
      <RecurringList items={filteredPausedItems}>
        <RecurringListTitle>Paused</RecurringListTitle>
        <RecurringListEmpty>
          {search
            ? "No paused recurring entries match your search"
            : "No paused recurring entries. Nice and tidy."}
        </RecurringListEmpty>
      </RecurringList>
        </>
      )}
    </div>
  );
}
