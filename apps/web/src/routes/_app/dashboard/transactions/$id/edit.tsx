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
import { EditTransactionForm } from "@/features/transactions/client/components/edit-transaction.form";
import { transactionQueries } from "@/features/transactions/client/transactions.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/edit")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        productQueries.getProductsOptions(),
      ),
      context.queryClient.ensureQueryData(tagsQueries.getTagsOptions()),
      context.queryClient.ensureQueryData(
        transactionQueries.getTransactionOptions(params.id),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Modify transaction details
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <EditTransactionFormWrapper />
      </Suspense>
    </div>
  );
}

function EditTransactionFormWrapper() {
  const { id } = Route.useParams();

  const {
    data: [expectedProductError, products],
    error: unexpectedProductError,
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const {
    data: [expectedTagsError, tags],
    error: unexpectedTagsError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const {
    data: [expectedTransactionError, transaction],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionOptions(id));

  if (unexpectedProductError || unexpectedTagsError || unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (expectedProductError) {
    const reason = expectedProductError.reason;
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

  if (expectedTransactionError) {
    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        return (
          <ExpectedErrorBlock
            title="Transaction not found"
            message="The transaction you are trying to edit does not exist."
          />
        );
      case "TRANSACTION_UNAUTHORIZED":
        return (
          <ExpectedErrorBlock
            title="Unauthorized"
            message="You do not have permission to edit this transaction."
          />
        );
      case "UNEXPECTED_DB_ERROR":
        return (
          <ExpectedErrorBlock
            title="Database error"
            message="Something went wrong trying to fetch the transaction from the database. Please try again"
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

  return (
    <EditTransactionForm
      products={products}
      tags={tags || []}
      transaction={transaction}
    />
  );
}
