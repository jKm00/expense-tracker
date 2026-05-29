import { assertOnline } from "@/lib/offline-guard";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shoppingController } from "./shopping.controller";
import {
  AddShoppingItemDTO,
  CompleteShoppingDTO,
  RemoveShoppingItemDTO,
  ToggleShoppingItemDTO,
} from "./shopping.dtos";
import { ShoppingListWithItems } from "./shopping.models";
import { SHOPPING_QUERY_KEY } from "./shopping.queries";
import { PRODUCT_QUERY_KEY } from "../products/products.queries";
import { TRANSACTION_QUERY_KEY } from "../transactions/transactions.queries";

type ShoppingQueryData = Awaited<ReturnType<typeof shoppingController.getShoppingList>>;

type ShoppingMutationContext = {
  previousShoppingList?: ShoppingQueryData;
};

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getShoppingListSnapshot(qc: QueryClient) {
  return qc.getQueryData<ShoppingQueryData>([SHOPPING_QUERY_KEY]);
}

function restoreShoppingListSnapshot(qc: QueryClient, snapshot?: ShoppingQueryData) {
  if (!snapshot) {
    return;
  }

  qc.setQueryData<ShoppingQueryData>([SHOPPING_QUERY_KEY], snapshot);
}

function updateShoppingListCache(
  qc: QueryClient,
  updater: (list: ShoppingListWithItems) => ShoppingListWithItems,
) {
  qc.setQueryData<ShoppingQueryData>([SHOPPING_QUERY_KEY], (current) => {
    if (!current || current[0] || !current[1]) {
      return current;
    }

    const nextList = updater(current[1]);
    return nextList === current[1] ? current : [current[0], nextList];
  });
}

function makeOptimisticProduct(product: AddShoppingItemDTO["product"]) {
  const now = new Date();
  const id = product.id ?? createTempId("temp-product");

  return {
    id,
    userId: "",
    name: product.name,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } satisfies ShoppingListWithItems["items"][number]["product"];
}

function makeOptimisticItem(product: AddShoppingItemDTO["product"]) {
  const now = new Date();
  const productRow = makeOptimisticProduct(product);

  return {
    id: createTempId("temp-shopping-item"),
    shoppingListId: createTempId("temp-shopping-list"),
    productId: productRow.id,
    checked: false,
    createdAt: now,
    updatedAt: now,
    product: productRow,
  } satisfies ShoppingListWithItems["items"][number];
}

function makeOptimisticItems(
  list: ShoppingListWithItems,
  product: AddShoppingItemDTO["product"],
) {
  if (product.id && list.items.some((item) => item.product.id === product.id)) {
    return list.items;
  }

  return [...list.items, makeOptimisticItem(product)];
}

function addShoppingItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddShoppingItemDTO) => {
      assertOnline();
      return await shoppingController.addShoppingItem({ data });
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: [SHOPPING_QUERY_KEY] });

      const previousShoppingList = getShoppingListSnapshot(qc);
      updateShoppingListCache(qc, (list) => ({
        ...list,
        items: makeOptimisticItems(list, data.product),
      }));

      return { previousShoppingList } satisfies ShoppingMutationContext;
    },
    onSuccess: (result, _variables, context) => {
      const [error] = result;
      if (error) {
        restoreShoppingListSnapshot(qc, context?.previousShoppingList);
        toast.error(error.message ?? "Something unexpected happened trying to add the item. Please try again!");
        return;
      }

      qc.invalidateQueries({ queryKey: [SHOPPING_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
    },
    onError: (_error, _variables, context) => {
      restoreShoppingListSnapshot(qc, context?.previousShoppingList);
      toast.error("Something unexpected happened trying to add the item. Please try again!");
    },
  });
}

function toggleShoppingItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToggleShoppingItemDTO) => {
      assertOnline();
      return await shoppingController.toggleShoppingItem({ data });
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: [SHOPPING_QUERY_KEY] });

      const previousShoppingList = getShoppingListSnapshot(qc);
      updateShoppingListCache(qc, (list) => ({
        ...list,
        items: list.items.map((item) =>
          item.id === data.shoppingItemId ? { ...item, checked: data.checked } : item,
        ),
      }));

      return { previousShoppingList } satisfies ShoppingMutationContext;
    },
    onSuccess: (result, _variables, context) => {
      const [error] = result;
      if (error) {
        restoreShoppingListSnapshot(qc, context?.previousShoppingList);
        toast.error(error.message ?? "Something unexpected happened trying to update the item. Please try again!");
        return;
      }

      qc.invalidateQueries({ queryKey: [SHOPPING_QUERY_KEY] });
    },
    onError: (_error, _variables, context) => {
      restoreShoppingListSnapshot(qc, context?.previousShoppingList);
      toast.error("Something unexpected happened trying to update the item. Please try again!");
    },
  });
}

function removeShoppingItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: RemoveShoppingItemDTO) => {
      assertOnline();
      return await shoppingController.removeShoppingItem({ data });
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: [SHOPPING_QUERY_KEY] });

      const previousShoppingList = getShoppingListSnapshot(qc);
      updateShoppingListCache(qc, (list) => ({
        ...list,
        items: list.items.filter((item) => item.id !== data.shoppingItemId),
      }));

      return { previousShoppingList } satisfies ShoppingMutationContext;
    },
    onSuccess: (result, _variables, context) => {
      const [error] = result;
      if (error) {
        restoreShoppingListSnapshot(qc, context?.previousShoppingList);
        toast.error(error.message ?? "Something unexpected happened trying to remove the item. Please try again!");
        return;
      }

      qc.invalidateQueries({ queryKey: [SHOPPING_QUERY_KEY] });
    },
    onError: (_error, _variables, context) => {
      restoreShoppingListSnapshot(qc, context?.previousShoppingList);
      toast.error("Something unexpected happened trying to remove the item. Please try again!");
    },
  });
}

function completeShopping() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompleteShoppingDTO) => {
      assertOnline();
      return await shoppingController.completeShopping({ data });
    },
    // Do not run optimistic updates for completeShopping; it causes a UI flash
    onSuccess: (result, _variables, _context) => {
      const [error] = result;
      if (error) {
        toast.error(
          error.message ??
            "Something unexpected happened trying to complete shopping. Please try again!",
        );
        return;
      }

      // Invalidate transactions and products. Skip invalidating shopping list
      // to avoid it refetching and showing empty state before navigation.
      qc.invalidateQueries({ queryKey: [TRANSACTION_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
    },
    onError: (_error, _variables, context) => {
      restoreShoppingListSnapshot(qc, context?.previousShoppingList);
      toast.error("Something unexpected happened trying to complete shopping. Please try again!");
    },
  });
}

export const shoppingMutations = {
  addShoppingItem,
  toggleShoppingItem,
  removeShoppingItem,
  completeShopping,
};
