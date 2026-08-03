import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { LoaderButton } from "@/components/custom/loader.button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { productQueries } from "@/features/products/products.queries";
import { ShoppingListView } from "@/features/shopping/components/shopping-list";
import { shoppingMutations } from "@/features/shopping/shopping.mutations";
import { shoppingQueries } from "@/features/shopping/shopping.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCheck, MoreHorizontal, ShoppingBag, Trash2 } from "lucide-react";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/shopping/")({
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
    <div className="mx-auto max-w-4xl space-y-6">
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
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const clearCompletedShoppingItems = shoppingMutations.clearCompletedShoppingItems();
  const clearShoppingList = shoppingMutations.clearShoppingList();

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
  const totalCount = shoppingList.items.length;
  const hasCheckedItems = checkedCount > 0;

  function handleClearCompleted() {
    if (!hasCheckedItems) return;
    clearCompletedShoppingItems.mutate();
  }

  function handleClearAll() {
    clearShoppingList.mutate(undefined, {
      onSuccess: (result) => {
        const [error] = result;
        if (!error) {
          setClearAllOpen(false);
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {totalCount} items
          </p>
          <p className="text-xs text-muted-foreground">
            {checkedCount} checked, {totalCount - checkedCount} left
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {hasCheckedItems ? (
            <LoaderButton
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              isLoading={clearCompletedShoppingItems.isPending}
              disabled={clearCompletedShoppingItems.isPending}
              onClick={handleClearCompleted}
            >
              <CheckCheck className="size-3.5" />
              Clear completed
            </LoaderButton>
          ) : null}
          {hasCheckedItems ? (
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link to="/dashboard/shopping/checkout">
                <ShoppingBag className="size-4" />
                Checkout
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled>
              <ShoppingBag className="size-4" />
              Checkout
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Shopping list actions"
                disabled={totalCount === 0 || clearShoppingList.isPending}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setClearAllOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Clear all...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ShoppingListView list={shoppingList} products={products} />

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <AlertDialogTitle>Clear the whole shopping list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {totalCount} shopping list items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearShoppingList.isPending}>
              Keep list
            </AlertDialogCancel>
            <LoaderButton
              type="button"
              variant="destructive"
              size="sm"
              isLoading={clearShoppingList.isPending}
              disabled={clearShoppingList.isPending}
              onClick={handleClearAll}
            >
              Clear shopping list
            </LoaderButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
