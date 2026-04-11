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
import { transactionQueries } from "@/features/transactions/transactions.queries";
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
} from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionOptions(params.id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="space-y-6 @container">
      <PageHeader>
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

  if (unexpectedError) {
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

  return (
    <div className="space-y-6 @container">
      <div className="grid gap-3 @xl:grid-cols-2 @2xl:grid-cols-4">
        <KpiCard
          title="Date"
          value={transaction.createdAt.toLocaleString("en-UK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          subtitle="Transaction date"
          icon={Calendar}
        />
        <KpiCard
          title="Total"
          value={transaction.totalPrice}
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

      <EntryList entries={transaction.entries}>
        <EntryListTitle>Transaction Items</EntryListTitle>
        <EntryListEmpty>No transaction items found...</EntryListEmpty>
      </EntryList>
    </div>
  );
}
