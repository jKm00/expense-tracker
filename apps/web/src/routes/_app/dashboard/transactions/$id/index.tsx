import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
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
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction.alert";
import {
  EntryList,
  EntryListEmpty,
  EntryListTitle,
} from "@/features/transactions/components/entry-list";
import { tagsQueries } from "@/features/tags/tags.queries";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { formatAmount } from "@/utils/format";
import { toCapitalized } from "@/utils/typography";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Braces,
  Calendar,
  CircleDollarSign,
  Package,
  SquarePen,
  Trash,
  TriangleAlert,
} from "lucide-react";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionOptions(params.id),
      ),
      context.queryClient.prefetchQuery(tagsQueries.getTagsOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="space-y-6 @container">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Transaction Details</PageHeaderTitle>
        <PageHeaderDescription>
          View and edit details about the transaction
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/transactions/$id/edit" params={{ id }}>
              <SquarePen className="size-4" />
              <span className="@max-lg:sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteTransactionDialog transactionId={id}>
            <Trash className="size-4" />
            <span className="@max-lg:sr-only">Delete</span>
          </DeleteTransactionDialog>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={2} />}>
        <TransactionDetails />
      </Suspense>
    </div>
  );
}

function TransactionDetails() {
  const { id } = Route.useParams();
  const {
    data: [expectedError, transaction],
    error: unexpectedError,
  } = useSuspenseQuery(transactionQueries.getTransactionOptions(id));
  const {
    data: [expectedTagsError, tags],
    error: unexpectedTagsError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  if (unexpectedError || unexpectedTagsError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        title = "Transaction not found";
        message = `Transaction not found. Make sure the URL is correct with the correct product ID`;
        break;
      case "TRANSACTION_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to view this product!";
        break;
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the transaction from the database. Please try again!";
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

  if (expectedTagsError) {
    let title: string;
    let message: string;

    const reason = expectedTagsError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch tags from the database. Please try again!";
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
      <div className="grid gap-3 @xl:grid-cols-2 @2xl:grid-cols-4">
        <KpiCard
          title="Date"
          value={transaction.date.toLocaleString("en-UK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          subtitle="Transaction date"
          icon={Calendar}
        />
        <KpiCard
          title="Total"
          value={formatAmount(transaction.totalPrice)}
          subtitle="Total amount"
          icon={CircleDollarSign}
        />
        <KpiCard
          title="Items"
          value={`${transaction.entries.length}`}
          subtitle="Number of items"
          icon={Package}
        />
        <KpiCard
          title="Source"
          value={toCapitalized(transaction.source)}
          subtitle="How it was created"
          icon={Braces}
        />
      </div>

      {transaction.needsReview ? (
        <Alert className="border-yellow-500/40 bg-yellow-500/10">
          <TriangleAlert />
          <AlertTitle>Needs Review</AlertTitle>
          <AlertDescription>
            This transaction was automatically created. Review and edit to
            confirm it.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            General information about the transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Store</Label>
            <Input
              defaultValue={transaction.store || ""}
              readOnly
              placeholder="Not specified..."
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              defaultValue={transaction.description || ""}
              readOnly
              placeholder="Not specified..."
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <EntryList
        entries={transaction.entries}
        transactionId={transaction.id}
        availableTags={tags || []}
      >
        <EntryListTitle>Transaction Items</EntryListTitle>
        <EntryListEmpty>No transaction items found...</EntryListEmpty>
      </EntryList>
    </div>
  );
}
