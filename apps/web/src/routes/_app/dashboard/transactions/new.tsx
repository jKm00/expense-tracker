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
import { DraftMethod, TransactionDraftWorkspace } from "@/features/transactions/components/transaction-draft-workspace";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "react";
import z from "zod";

const transactionMethodSearchSchema = z.object({
  method: z.enum(["manual", "scan"]).default("manual"),
  scanId: z.string().optional(),
});

export const Route = createFileRoute("/_app/dashboard/transactions/new")({
  validateSearch: zodValidator(transactionMethodSearchSchema),
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>New Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Document a new transaction manually or from a receipt scan
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <NewTransactionContent />
      </Suspense>
    </div>
  );
}

function NewTransactionContent() {
  const navigate = useNavigate();
  const { method, scanId } = Route.useSearch();
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
      kind="new"
      method={method}
      initialScanId={scanId}
      products={products}
      tags={tags || []}
      onMethodChange={(nextMethod: DraftMethod) => {
        navigate({ to: "/dashboard/transactions/new", search: { method: nextMethod } });
      }}
    />
  );
}
