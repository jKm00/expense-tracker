import { productQueries } from "@/features/products/client/products.queries";
import { shoppingQueries } from "@/features/shopping/client/shopping.queries";
import { useSuspenseQuery, type QueryClient } from "@tanstack/react-query";

export async function prefetchShoppingPageData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.prefetchQuery(shoppingQueries.getShoppingListOptions()),
    queryClient.prefetchQuery(productQueries.getProductsOptions()),
  ]);
}

export function useShoppingPageData() {
  const {
    data: [shoppingError, shoppingList],
    error: unexpectedShoppingError,
  } = useSuspenseQuery(shoppingQueries.getShoppingListOptions());
  const {
    data: [productsError, products],
    error: unexpectedProductsError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return {
    shoppingError,
    shoppingList,
    productsError,
    products,
    unexpectedError: unexpectedShoppingError || unexpectedProductsError,
  };
}
