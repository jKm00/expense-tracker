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
import { ScanBetaBadge, ScanLoadingState } from "@/features/receipt-scanning/components/scan-states";
import { shoppingQueries } from "@/features/shopping/shopping.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/checkout/scan")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productQueries.getProductsOptions()),
      context.queryClient.ensureQueryData(shoppingQueries.getShoppingListOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle><span className="inline-flex items-center gap-2">Scan Checkout Receipt <ScanBetaBadge /></span></PageHeaderTitle>
        <PageHeaderDescription>
          Scan a receipt to fill checkout entries, then review before completion.
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<ScanLoadingState />}>
        <ScanCheckoutContent />
      </Suspense>
    </div>
  );
}

function ScanCheckoutContent() {
  const navigate = useNavigate();
  const {
    data: [productsError, products],
    error: unexpectedProductsError,
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const {
    data: [shoppingError, shoppingList],
    error: unexpectedShoppingError,
  } = useSuspenseQuery(shoppingQueries.getShoppingListOptions());

  if (unexpectedProductsError || unexpectedShoppingError) {
    return <UnexpectedError />;
  }

  if (productsError || shoppingError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Checkout scan unavailable</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Could not load the data needed for checkout scanning. Please try again.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  const checkedCount = shoppingList.items.filter((item) => item.checked).length;
  if (checkedCount === 0) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>No checked shopping items</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Check at least one shopping item before using receipt checkout scanning.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <ReceiptScanReview
      mode="shopping-checkout"
      products={products}
      fallbackHref="/dashboard/shopping/checkout"
      onComplete={(transactionId) => {
        navigate({
          to: "/dashboard/transactions/$id",
          params: { id: transactionId },
        });
      }}
    />
  );
}
