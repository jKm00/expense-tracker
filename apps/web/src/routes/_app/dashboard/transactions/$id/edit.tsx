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
import { productQueries } from "@/features/products/products.queries";
import { tagsQueries } from "@/features/tags/tags.queries";
import { TransactionDraftWorkspace } from "@/features/transactions/components/transaction-draft-workspace";
import { transactionQueries } from "@/features/transactions/transactions.queries";
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Modify transaction details manually or replace entries from a receipt scan
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
    let title: string;
    let message: string;

    const reason = expectedProductError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the database. Please try again";
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

  if (expectedTransactionError) {
    let title: string;
    let message: string;

    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        title = "Transaction not found";
        message = "The transaction you are trying to edit does not exist.";
        break;
      case "TRANSACTION_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to edit this transaction.";
        break;
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the transaction from the database. Please try again";
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
          "Something went wrong trying to fetch your tags from the database. Please try again";
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
    <TransactionDraftWorkspace
      kind="edit"
      products={products}
      tags={tags || []}
      transaction={transaction}
    />
  );
}
