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
import { ReceiptScanReview } from "@/features/receipt-scanning/components/receipt-scan-review";
import { productQueries } from "@/features/products/products.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/scan")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(productQueries.getProductsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Scan Receipt</PageHeaderTitle>
        <PageHeaderDescription>
          Upload a receipt and review the suggested transaction before saving.
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <ScanTransactionContent />
      </Suspense>
    </div>
  );
}

function ScanTransactionContent() {
  const navigate = useNavigate();
  const {
    data: [expectedError, products],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Products unavailable</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Could not load products for receipt matching. Please try again.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <ReceiptScanReview
      mode="transaction"
      products={products}
      fallbackHref="/dashboard/transactions/new"
      onComplete={(transactionId) => {
        navigate({
          to: "/dashboard/transactions/$id",
          params: { id: transactionId },
        });
      }}
    />
  );
}
