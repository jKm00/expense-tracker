import { ExpectedErrorBlock } from "@/components/custom/errors/expected-error-block";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import {
  prefetchShoppingPageData,
  useShoppingPageData,
} from "@/features/shopping/client/shopping-page-data";
import { ShoppingListView } from "@/features/shopping/client/components/shopping-list";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/")({
  loader: async ({ context }) => {
    await prefetchShoppingPageData(context.queryClient);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>
          <span className="inline-flex items-center gap-2">Shopping</span>
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
            message="Something went wrong trying to load products for shopping. Please try again!"
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
  const hasCheckedItems = checkedCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {shoppingList.items.length} items
          </p>
          <p className="text-xs text-muted-foreground">
            {checkedCount} checked, {shoppingList.items.length - checkedCount}{" "}
            left
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
