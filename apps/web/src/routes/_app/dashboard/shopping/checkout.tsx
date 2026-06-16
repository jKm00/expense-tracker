import { ExpectedErrorBlock } from "@/components/custom/errors/expected-error-block";
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
import {
  prefetchShoppingPageData,
  useShoppingPageData,
} from "@/features/shopping/client/shopping-page-data";
import { ShoppingCheckoutForm } from "@/features/shopping/client/components/shopping-checkout.form";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/checkout")({
  loader: async ({ context }) => {
    await prefetchShoppingPageData(context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>
          <span className="inline-flex items-center gap-2">Checkout</span>
        </PageHeaderTitle>
        <PageHeaderDescription>
          Turn checked shopping items into a transaction
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

function CheckoutContent() {
  const { shoppingError, shoppingList, productsError, products, unexpectedError } =
    useShoppingPageData();

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (shoppingError) {
    const reason = shoppingError.reason;
    switch (reason) {
      case "SHOPPING_DB_ERROR":
        return (
          <ExpectedErrorBlock
            title="Database error"
            message="Something went wrong trying to load your shopping list. Please try again!"
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

  if (productsError) {
    const reason = productsError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        return (
          <ExpectedErrorBlock
            title="Database error"
            message="Something went wrong trying to load products for checkout. Please try again!"
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

  const checkedCount = shoppingList.items.filter((item) => item.checked).length;

  if (checkedCount === 0) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>No items checked</ExpectedErrorTitle>
        <ExpectedErrorMessage>
          Check at least one shopping item before starting checkout.
        </ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return <ShoppingCheckoutForm list={shoppingList} products={products} />;
}
