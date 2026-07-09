// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { shoppingMutations } from "./shopping.mutations";
import { SHOPPING_QUERY_KEY } from "./shopping.queries";
import { TRANSACTION_QUERY_KEY } from "../transactions/transactions.queries";

vi.mock("@/lib/offline-guard", () => ({
  assertOnline: vi.fn(),
}));

vi.mock("./shopping.controller", () => ({
  shoppingController: {
    getShoppingList: vi.fn(),
    addShoppingItem: vi.fn(),
    toggleShoppingItem: vi.fn(),
    removeShoppingItem: vi.fn(),
    clearCompletedShoppingItems: vi.fn(),
    clearShoppingList: vi.fn(),
    completeShopping: vi.fn(),
  },
}));

vi.mock("../products/products.queries", () => ({
  PRODUCT_QUERY_KEY: "products",
}));

vi.mock("../transactions/transactions.queries", () => ({
  TRANSACTION_QUERY_KEY: "transactions",
}));

vi.mock("../auth/auth.utils", () => ({
  authenticated: {},
  getSession: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { shoppingController } from "./shopping.controller";

const mockShoppingController = vi.mocked(shoppingController);

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeList() {
  return {
    id: "list-1",
    userId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    items: [
      {
        id: "item-1",
        shoppingListId: "list-1",
        productId: "product-1",
        checked: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        product: {
          id: "product-1",
          userId: "user-1",
          name: "Milk",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          deletedAt: null,
        },
      },
      {
        id: "item-2",
        shoppingListId: "list-1",
        productId: "product-2",
        checked: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        product: {
          id: "product-2",
          userId: "user-1",
          name: "Bread",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          deletedAt: null,
        },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shoppingMutations", () => {
  it("restores the shopping list when add item returns an application error", async () => {
    mockShoppingController.addShoppingItem.mockResolvedValue([
      { reason: "SHOPPING_DB_ERROR", message: "boom" },
      null,
    ] as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([SHOPPING_QUERY_KEY], [null, makeList()]);

    const { result } = renderHook(() => shoppingMutations.addShoppingItem(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({ product: { id: null, name: "Eggs" } });

    await waitFor(() => {
      const cached = queryClient.getQueryData<[unknown, ReturnType<typeof makeList>]>([
        SHOPPING_QUERY_KEY,
      ]);
      expect(cached?.[1].items).toHaveLength(2);
    });

    const cached = queryClient.getQueryData<[unknown, ReturnType<typeof makeList>]>([
      SHOPPING_QUERY_KEY,
    ]);
    expect(cached?.[1].items).toHaveLength(2);
    expect(cached?.[1].items[0].product.name).toBe("Milk");
  });

  it("seeds the transaction detail cache after completing shopping", async () => {
    const transaction = {
      id: "tx-linked",
      store: "Updated Shop",
      description: "Updated groceries",
    };
    mockShoppingController.completeShopping.mockResolvedValue([
      null,
      transaction,
    ] as any);

    const queryClient = new QueryClient();
    const { result } = renderHook(() => shoppingMutations.completeShopping(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      store: "Updated Shop",
      description: "Updated groceries",
      date: new Date("2024-01-15"),
      transactionId: "tx-linked",
      keepUncheckedItems: true,
      shoppingItemIds: ["item-1"],
      entries: [
        {
          shoppingItemId: "item-1",
          product: { id: "product-1", name: "Milk" },
          quantity: "1",
          price: "10",
          type: "expense",
          tagIds: [],
        },
      ],
    });

    expect(
      queryClient.getQueryData([TRANSACTION_QUERY_KEY, "tx-linked"]),
    ).toEqual([null, transaction]);
  });

  it("optimistically removes checked items when clearing completed items", async () => {
    mockShoppingController.clearCompletedShoppingItems.mockResolvedValue([
      null,
      [],
    ] as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([SHOPPING_QUERY_KEY], [null, makeList()]);

    const { result } = renderHook(
      () => shoppingMutations.clearCompletedShoppingItems(),
      {
        wrapper: makeWrapper(queryClient),
      },
    );

    await result.current.mutateAsync();

    const cached = queryClient.getQueryData<[unknown, ReturnType<typeof makeList>]>([
      SHOPPING_QUERY_KEY,
    ]);
    expect(mockShoppingController.clearCompletedShoppingItems).toHaveBeenCalledWith();
    expect(cached?.[1].items).toHaveLength(1);
    expect(cached?.[1].items[0].id).toBe("item-1");
  });

  it("optimistically removes every item when clearing the full list", async () => {
    mockShoppingController.clearShoppingList.mockResolvedValue([null, []] as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([SHOPPING_QUERY_KEY], [null, makeList()]);

    const { result } = renderHook(() => shoppingMutations.clearShoppingList(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync();

    const cached = queryClient.getQueryData<[unknown, ReturnType<typeof makeList>]>([
      SHOPPING_QUERY_KEY,
    ]);
    expect(mockShoppingController.clearShoppingList).toHaveBeenCalledWith();
    expect(cached?.[1].items).toHaveLength(0);
  });
});
