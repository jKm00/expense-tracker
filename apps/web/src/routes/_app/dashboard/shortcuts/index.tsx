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
import { BetaBadge } from "@/components/custom/beta-badge";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { Button } from "@/components/ui/button";
import { ShortcutList } from "@/features/shortcuts/components/shortcut-list";
import { shortcutQueries } from "@/features/shortcuts/shortcuts.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Zap } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shortcuts/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      shortcutQueries.getShortcutsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderTitle>
          Shortcuts <BetaBadge enabled className="ml-2 align-middle" />
        </PageHeaderTitle>
        <PageHeaderDescription>
          Tap a shortcut to log a transaction you make often
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/shortcuts/new">
              <Plus className="size-4" />
              <span className="max-md:sr-only">New shortcut</span>
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<SkeletonList rows={4} />}>
        <ShortcutsContent />
      </Suspense>
    </div>
  );
}

function ShortcutsContent() {
  const {
    data: [expectedError, items],
    error: unexpectedError,
  } = useSuspenseQuery(shortcutQueries.getShortcutsOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Database error</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Something went wrong trying to fetch your shortcuts. Please try
          again!
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={Zap}>
        <EmptyStateMessage>
          You do not have any shortcuts yet. Create one for a transaction you
          log often.
        </EmptyStateMessage>
        <EmptyStateAction>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/shortcuts/new">
              <Plus className="size-4" />
              Create shortcut
            </Link>
          </Button>
        </EmptyStateAction>
      </EmptyState>
    );
  }

  return <ShortcutList items={items} />;
}
