import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { DeleteRecurringDialog } from "@/features/recurring/components/delete-recurring.dialog";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { formatAmount } from "@/utils/format";
import { toCapitalized } from "@/utils/typography";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Repeat, SquarePen, ToggleLeft, Trash } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id/")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringOptions(params.id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="mx-auto max-w-4xl space-y-6 @container">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Recurring Details</PageHeaderTitle>
        <PageHeaderDescription>
          View details about this recurring item
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/recurring/$id/edit" params={{ id }}>
              <SquarePen className="size-4" />
              <span className="@max-lg:sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteRecurringDialog recurringId={id}>
            <Trash className="size-4" />
            <span className="@max-lg:sr-only">Delete</span>
          </DeleteRecurringDialog>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <RecurringDetails />
      </Suspense>
    </div>
  );
}

function RecurringDetails() {
  const { id } = Route.useParams();
  const {
    data: [expectedError, recurring],
    error: unexpectedError,
  } = useSuspenseQuery(recurringQueries.getRecurringOptions(id));

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "RECURRING_NOT_FOUND":
        title = "Not found";
        message =
          "Recurring transaction not found. Make sure the URL is correct.";
        break;
      case "RECURRING_UNAUTHORIZED":
        title = "Unauthorized";
        message =
          "You do not have permission to view this recurring transaction!";
        break;
      case "RECURRING_DB_ERROR":
        title = "Database error";
        message = "Something went wrong. Please try again!";
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

  const occurrencesSoFar = getOccurrencesSoFar(
    recurring.start,
    recurring.end,
    recurring.interval,
  );
  const nextOccurrence = recurring.isActive
    ? getNextOccurrence(recurring.start, recurring.end, recurring.interval)
    : null;

  return (
    <div className="space-y-6 @container">
      <div className="grid gap-3 @xl:grid-cols-3">
        <KpiCard
          title="Status"
          value={recurring.isActive ? "Active" : "Paused"}
          subtitle="Current state"
          icon={ToggleLeft}
        />
        <KpiCard
          title="Next run"
          value={
            nextOccurrence
              ? nextOccurrence.toLocaleString("en-UK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "No upcoming run"
          }
          subtitle={
            nextOccurrence
              ? "Next scheduled occurrence"
              : "Already ended or paused"
          }
          icon={Calendar}
        />
        <KpiCard
          title="Count"
          value={`${occurrencesSoFar}`}
          subtitle="Number of times payed"
          icon={Repeat}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            General information about this recurring item
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Input
              defaultValue={toCapitalized(recurring.type)}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <Input
              defaultValue={formatAmount(recurring.price)}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Product</Label>
            <Input
              defaultValue={recurring.products?.name ?? "Unknown product"}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Interval</Label>
            <Input
              defaultValue={toCapitalized(recurring.interval)}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Started</Label>
            <Input
              defaultValue={recurring.start.toLocaleString("en-UK", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              readOnly
              className="bg-muted/30"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getOccurrencesSoFar(
  start: Date,
  end: Date | null,
  interval: "weekly" | "monthly" | "yearly",
) {
  const now = new Date();
  const effectiveEnd = end && end < now ? end : now;

  if (start > effectiveEnd) {
    return 0;
  }

  let cursor = new Date(start);
  let occurrences = 0;

  while (cursor <= effectiveEnd) {
    occurrences += 1;
    cursor = advanceDate(cursor, interval);
  }

  return occurrences;
}

function getNextOccurrence(
  start: Date,
  end: Date | null,
  interval: "weekly" | "monthly" | "yearly",
) {
  const now = new Date();

  if (end && end < now) {
    return null;
  }

  let cursor = new Date(start);

  while (cursor < now) {
    cursor = advanceDate(cursor, interval);
  }

  if (end && cursor > end) {
    return null;
  }

  return cursor;
}

function advanceDate(date: Date, interval: "weekly" | "monthly" | "yearly") {
  const next = new Date(date);

  switch (interval) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}
