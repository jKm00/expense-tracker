import { ExpectedErrorBlock } from "@/components/custom/errors/expected-error-block";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { productQueries } from "@/features/products/client/products.queries";
import { tagsQueries } from "@/features/tags/client/tags.queries";
import { NewTransactionForm } from "@/features/transactions/client/components/new-transaction.form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/new")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productQueries.getProductsOptions()),
      context.queryClient.ensureQueryData(tagsQueries.getTagsOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>New Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Document a new transaction
        </PageHeaderDescription>
      </PageHeader>
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
  const {
    data: [expectedTagsError, tags],
    error: unexpectedTagsError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  if (unexpectedError || unexpectedTagsError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    const reason = expectedError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        return (
          <ExpectedErrorBlock
            title="Database error"
            message="Something went wrong trying to fetch your products from the database. Please try again"
          />
        );
      default:
        return (
          <ExpectedErrorBlock
            title="Unexpected error"
            message={`Something unexpected happened: ${reason satisfies never}. Please try again!`}
          />
        );
    }
  }

  if (expectedTagsError) {
    const reason = expectedTagsError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        return (
          <ExpectedErrorBlock
            title="Database error"
            message="Something went wrong trying to fetch your tags from the database. Please try again"
          />
        );
      default:
        return (
          <ExpectedErrorBlock
            title="Unexpected error"
            message={`Something unexpected happened: ${reason satisfies never}. Please try again!`}
          />
        );
    }
  }

  return <NewTransactionForm products={products} tags={tags || []} />;
}
