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
import { ShoppingCheckoutForm } from "@/features/shopping/components/shopping-checkout.form";
import { shoppingQueries } from "@/features/shopping/shopping.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/checkout")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        shoppingQueries.getShoppingListOptions(),
      ),
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
    ]);
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
  const {
    data: [shoppingError, shoppingList],
    error: unexpectedShoppingError,
  } = useSuspenseQuery(shoppingQueries.getShoppingListOptions());
  const {
    data: [productsError, products],
    error: unexpectedProductsError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  if (unexpectedShoppingError || unexpectedProductsError) {
    return <UnexpectedError />;
  }

  if (shoppingError) {
    let title: string;
    let message: string;

    switch (shoppingError.reason) {
      case "SHOPPING_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to load your shopping list. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${shoppingError.reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (productsError) {
    let title: string;
    let message: string;

    switch (productsError.reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to load products for checkout. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${productsError.reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
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
