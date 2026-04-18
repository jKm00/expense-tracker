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
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { DeleteRecurringDialog } from "@/features/recurring/components/delete-recurring.dialog";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { productQueries } from "@/features/products/products.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringOptions(params.id),
    );
    context.queryClient.prefetchQuery(productQueries.getProductsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderBackButton to="/dashboard/recurring" />
        <PageHeaderTitle>Recurring Details</PageHeaderTitle>
        <PageHeaderDescription>
          View and manage this recurring transaction
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <EditRecurringContent />
      </Suspense>
    </div>
  );
}

function EditRecurringContent() {
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

  return (
    <div className="space-y-8">
      <EditRecurringForm recurring={recurring} />
      <div className="pt-4 border-t border-border">
        <DeleteRecurringDialog recurringId={recurring.id}>
          Delete recurring transaction
        </DeleteRecurringDialog>
      </div>
    </div>
  );
}
