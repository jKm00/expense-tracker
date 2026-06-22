import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../products/products.service", () => ({
  productService: {
    getProduct: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("../transactions/transactions.service", () => ({
  transactionService: {
    saveTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

vi.mock("./shopping.repo", () => ({
  shoppingRepo: {
    getShoppingListByUser: vi.fn(),
    getOrCreateShoppingList: vi.fn(),
    getShoppingListItemById: vi.fn(),
    getShoppingListItemByListAndProduct: vi.fn(),
    saveShoppingListItem: vi.fn(),
    updateShoppingListItem: vi.fn(),
    touchShoppingList: vi.fn(),
    removeShoppingListItem: vi.fn(),
    removeShoppingListItemsByIds: vi.fn(),
    clearShoppingList: vi.fn(),
  },
}));

import { makeProduct, makeTransaction } from "../__test-fixtures__";
import { productService } from "../products/products.service";
import { transactionService } from "../transactions/transactions.service";
import { shoppingRepo } from "./shopping.repo";
import { shoppingService } from "./shopping.service";

const mockProductService = vi.mocked(productService);
const mockTransactionService = vi.mocked(transactionService);
const mockShoppingRepo = vi.mocked(shoppingRepo);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeList(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "list-1",
    userId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    items: [],
    ...overrides,
  };
}

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  const product = makeProduct();

  return {
    id: "item-1",
    shoppingListId: "list-1",
    productId: product.id,
    checked: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    product,
    ...overrides,
  };
}

describe("shoppingService", () => {
  describe("addShoppingItem", () => {
    it("returns the existing list item when the product is already on the list", async () => {
      const list = makeList({ items: [makeItem()] });
      const product = makeProduct();

      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockShoppingRepo.getOrCreateShoppingList.mockResolvedValue(list as any);
      mockShoppingRepo.getShoppingListItemByListAndProduct.mockResolvedValue(makeItem() as any);

      const [error, data] = await shoppingService.addShoppingItem("user-1", {
        product: { id: product.id, name: product.name },
      });

      expect(error).toBeNull();
      expect(data?.id).toBe("item-1");
      expect(mockShoppingRepo.saveShoppingListItem).not.toHaveBeenCalled();
      expect(mockShoppingRepo.touchShoppingList).toHaveBeenCalledWith("list-1");
    });
  });

  describe("completeShopping", () => {
    it("keeps unchecked items when requested", async () => {
      const list = makeList({
        items: [makeItem({ id: "checked-1" }), makeItem({ id: "unchecked-1", checked: false })],
      });
      const transaction = makeTransaction({ source: "shopping" });

      mockTransactionService.saveTransaction.mockResolvedValue([null, transaction] as any);
      mockShoppingRepo.getOrCreateShoppingList.mockResolvedValue(list as any);
      mockShoppingRepo.removeShoppingListItemsByIds.mockResolvedValue([] as any);

      const [error, data] = await shoppingService.completeShopping("user-1", {
        store: "Shop",
        description: "Groceries",
        date: new Date("2024-01-15"),
        keepUncheckedItems: true,
        shoppingItemIds: ["checked-1"],
        entries: [
          {
            shoppingItemId: "checked-1",
            product: { id: "product-1", name: "Milk" },
            quantity: "1",
            price: "10",
            total: "10",
            lastEditedField: "price",
            type: "expense",
            tagIds: [],
          },
        ],
      });

      expect(error).toBeNull();
      expect(data).toEqual(transaction);
      expect(mockTransactionService.saveTransaction).toHaveBeenCalledOnce();
      expect(mockTransactionService.updateTransaction).not.toHaveBeenCalled();
      expect(mockShoppingRepo.removeShoppingListItemsByIds).toHaveBeenCalledWith("list-1", ["checked-1"]);
      expect(mockShoppingRepo.clearShoppingList).not.toHaveBeenCalled();
    });

    it("updates an existing transaction when transactionId is provided", async () => {
      const list = makeList({ items: [makeItem()] });
      const transaction = makeTransaction({ id: "tx-linked", source: "shopping" });

      mockTransactionService.updateTransaction.mockResolvedValue([
        null,
        transaction,
      ] as any);
      mockShoppingRepo.getOrCreateShoppingList.mockResolvedValue(list as any);
      mockShoppingRepo.removeShoppingListItemsByIds.mockResolvedValue([] as any);

      const [error, data] = await shoppingService.completeShopping("user-1", {
        store: "Shop",
        description: "Groceries",
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
            total: "10",
            lastEditedField: "price",
            type: "expense",
            tagIds: [],
          },
        ],
      });

      expect(error).toBeNull();
      expect(data).toEqual(transaction);
      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
        "user-1",
        "tx-linked",
        expect.objectContaining({
          transaction: expect.objectContaining({
            store: "Shop",
            description: "Groceries",
            source: "shopping",
          }),
        }),
      );
      expect(mockTransactionService.updateTransaction).not.toHaveBeenCalledWith(
        "user-1",
        "tx-linked",
        expect.objectContaining({
          transaction: expect.objectContaining({
            date: expect.any(Date),
          }),
        }),
      );
      expect(mockTransactionService.saveTransaction).not.toHaveBeenCalled();
    });

    it("does not overwrite linked transaction metadata with empty checkout fields", async () => {
      const list = makeList({ items: [makeItem()] });
      const transaction = makeTransaction({ id: "tx-linked", source: "shopping" });

      mockTransactionService.updateTransaction.mockResolvedValue([
        null,
        transaction,
      ] as any);
      mockShoppingRepo.getOrCreateShoppingList.mockResolvedValue(list as any);
      mockShoppingRepo.removeShoppingListItemsByIds.mockResolvedValue([] as any);

      const [error] = await shoppingService.completeShopping("user-1", {
        store: "",
        description: "",
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
            total: "10",
            lastEditedField: "price",
            type: "expense",
            tagIds: [],
          },
        ],
      });

      expect(error).toBeNull();
      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
        "user-1",
        "tx-linked",
        expect.objectContaining({
          transaction: { source: "shopping" },
        }),
      );
    });

    it("clears all list items when unchecked items should be removed", async () => {
      const list = makeList({ items: [makeItem()] });
      const transaction = makeTransaction({ source: "shopping" });

      mockTransactionService.saveTransaction.mockResolvedValue([null, transaction] as any);
      mockShoppingRepo.getOrCreateShoppingList.mockResolvedValue(list as any);
      mockShoppingRepo.clearShoppingList.mockResolvedValue([] as any);

      const [error] = await shoppingService.completeShopping("user-1", {
        store: undefined,
        description: undefined,
        date: new Date("2024-01-15"),
        keepUncheckedItems: false,
        shoppingItemIds: ["item-1"],
        entries: [
          {
            shoppingItemId: "item-1",
            product: { id: "product-1", name: "Milk" },
            quantity: "1",
            price: "10",
            total: "10",
            lastEditedField: "price",
            type: "expense",
            tagIds: [],
          },
        ],
      });

      expect(error).toBeNull();
      expect(mockShoppingRepo.clearShoppingList).toHaveBeenCalledWith("list-1");
    });
  });
});
