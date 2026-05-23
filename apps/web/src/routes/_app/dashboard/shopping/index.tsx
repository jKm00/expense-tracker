import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { productQueries } from "@/features/products/products.queries";
import { ShoppingListView } from "@/features/shopping/components/shopping-list";
import { shoppingQueries } from "@/features/shopping/shopping.queries";
import { env } from "@/config/env";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        shoppingQueries.getShoppingListOptions(),
      ),
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
    ]);

    const showBetaBadge = env.SHOPPING_BETA_BADGE.trim().toLowerCase() !== "false";

    return { showBetaBadge };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { showBetaBadge } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>
          <span className="inline-flex items-center gap-2">
            Shopping
            {showBetaBadge ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                BETA
              </Badge>
            ) : null}
          </span>
        </PageHeaderTitle>
        <PageHeaderDescription>
          Build a grocery list and check items off while shopping
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <ShoppingContent />
      </Suspense>
    </div>
  );
}

function ShoppingContent() {
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
          "Something went wrong trying to load products for shopping. Please try again!";
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
  const hasCheckedItems = checkedCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">{shoppingList.items.length} items</p>
          <p className="text-xs text-muted-foreground">
            {checkedCount} checked, {shoppingList.items.length - checkedCount} left
          </p>
        </div>
        {hasCheckedItems ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/shopping/checkout">
              <ShoppingBag className="size-4" />
              Checkout
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ShoppingBag className="size-4" />
            Checkout
          </Button>
        )}
      </div>
      <ShoppingListView list={shoppingList} products={products} />
    </div>
  );
}
