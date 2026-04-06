import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { productQueries } from "@/features/products/products.queries";
import { NewTransactionForm } from "@/features/transactions/components/new-transaction.form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      productQueries.getProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">New Transaction</h1>
        <p className="text-sm text-muted-foreground">
          Document a new transaction
        </p>
      </div>
      <Suspense>
        <NewProductForm />
      </Suspense>
    </div>
  );
}

function NewProductForm() {
  const {
    data: [expectedError, products],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
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

  return <NewTransactionForm products={products} />;
}
