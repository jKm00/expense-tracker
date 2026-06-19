import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id/edit")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      recurringQueries.getRecurringOptions(params.id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Recurring</PageHeaderTitle>
        <PageHeaderDescription>Modify recurring item details</PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={null}>
        <EditRecurringFormWrapper />
      </Suspense>
    </div>
  );
}

function EditRecurringFormWrapper() {
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
        title = "Recurring not found";
        message = "The recurring item you are trying to edit does not exist.";
        break;
      case "RECURRING_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to edit this recurring item.";
        break;
      case "RECURRING_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the recurring item from the database. Please try again!";
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

  return <EditRecurringForm recurring={recurring} />;
}
