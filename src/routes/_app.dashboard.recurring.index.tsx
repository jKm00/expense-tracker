import { recurringQueries } from "@/features/recurring/recurring.queries";
import { RecurringList } from "@/features/recurring/components/recurring-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { PlusIcon, AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        action={
          <Button asChild size="sm">
            <Link to="/dashboard/recurring/new">
              <PlusIcon className="size-4 mr-2" />
              New
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SkeletonList rows={5} />}>
        <RecurringListSection />
      </Suspense>
    </div>
  );
}

function RecurringListSection() {
  const { data, error } = useSuspenseQuery(
    recurringQueries.getRecurringProductsOptions(),
  );

  if (error) {
    return (
      <EmptyState
        message="Failed to load recurring transactions."
        icon={AlertTriangleIcon}
      />
    );
  }

  const [err, recurring] = data;

  if (err) {
    return (
      <EmptyState
        message="Failed to load recurring transactions. Please try again."
        icon={AlertTriangleIcon}
      />
    );
  }

  return <RecurringList items={recurring} />;
}
