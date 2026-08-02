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
import { productQueries } from "@/features/products/products.queries";
import { ReceiptScanReview } from "@/features/receipt-scanning/components/receipt-scan-review";
import { ScanLoadingState } from "@/features/receipt-scanning/components/scan-states";
import { takePendingTransactionScan } from "@/features/receipt-scanning/receipt-scan-session";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/scan")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productQueries.getProductsOptions()),
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
        <PageHeaderTitle>Scan Receipt</PageHeaderTitle>
        <PageHeaderDescription>
          Replace this transaction's entries with reviewed receipt lines.
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<ScanLoadingState />}>
        <ScanExistingTransactionContent />
      </Suspense>
    </div>
  );
}

function ScanExistingTransactionContent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [initialScanResult] = useState(() => takePendingTransactionScan(id));
  const {
    data: [productsError, products],
    error: unexpectedProductsError,
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const {
    data: [transactionError, transaction],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionOptions(id));

  if (unexpectedProductsError || unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (productsError || transactionError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Scan unavailable</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Could not load the data needed to scan this transaction. Please try again.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (transaction.source === "recurring") {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Recurring transaction</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Receipt scanning is not available for recurring transactions.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (transaction.entries.some((entry) => entry.type === "income")) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Income transaction</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Receipt scanning can only replace transactions that contain expense entries.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <ReceiptScanReview
      mode="transaction"
      products={products}
      fallbackHref={`/dashboard/transactions/${id}/edit`}
      initialScanResult={initialScanResult}
      targetTransaction={transaction}
      onComplete={(transactionId) => {
        navigate({
          to: "/dashboard/transactions/$id",
          params: { id: transactionId },
        });
      }}
    />
  );
}
