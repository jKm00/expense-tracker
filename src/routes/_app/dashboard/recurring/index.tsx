import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { Repeat, Plus, Pause, Play } from "lucide-react";
import { Suspense, useMemo } from "react";

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
    <div className="space-y-6">
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
  const {
    data: [expectedError, items],
    error: unexpectedError,
  } = useSuspenseQuery(recurringQueries.getRecurringsOptions());

  const { activeItems, pausedItems } = useMemo(() => {
    if (!items) return { activeItems: [], pausedItems: [] };

    const activeItems: RecurringWithProduct[] = [];
    const pausedItems: RecurringWithProduct[] = [];

    items.forEach((item) => {
      if (item.isActive) {
        activeItems.push(item);
      } else {
        pausedItems.push(item);
      }
    });

    return { activeItems, pausedItems };
  }, [items]);

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
      <div className="grid gap-3 @lg:grid-cols-2 @xl:grid-cols-3">
        <div className="@lg:col-span-2 @xl:col-span-1">
          <KpiCard
            title="Total"
            value={`${items.length}`}
            subtitle="All recurring"
            icon={Repeat}
          />
        </div>
        <KpiCard
          title="Active"
          value={`${activeItems.length}`}
          subtitle="Currently running"
          icon={Play}
        />
        <KpiCard
          title="Paused"
          value={`${pausedItems.length}`}
          subtitle="Currently paused"
          icon={Pause}
        />
      </div>
      <RecurringList items={activeItems}>
        <RecurringListTitle>Active</RecurringListTitle>
        <RecurringListEmpty>
          No active recurring transactions
        </RecurringListEmpty>
      </RecurringList>
      <RecurringList items={pausedItems}>
        <RecurringListTitle>Paused</RecurringListTitle>
        <RecurringListEmpty>
          No paused recurring transactions
        </RecurringListEmpty>
      </RecurringList>
    </div>
  );
}
