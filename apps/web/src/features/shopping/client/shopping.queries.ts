import { queryOptions } from "@tanstack/react-query";
import { shoppingController } from "@/features/shopping/server/shopping.controller";

export const SHOPPING_QUERY_KEY = "shopping";

function getShoppingListOptions() {
  return queryOptions({
    queryKey: [SHOPPING_QUERY_KEY],
    queryFn: shoppingController.getShoppingList,
  });
}

export const shoppingQueries = {
  getShoppingListOptions,
};
