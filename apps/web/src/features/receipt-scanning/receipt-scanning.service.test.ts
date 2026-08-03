import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "../__test-fixtures__";

vi.mock("../products/products.service", () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("../shopping/shopping.service", () => ({
  shoppingService: {
    getShoppingList: vi.fn(),
    completeShopping: vi.fn(),
  },
}));

vi.mock("../transactions/transactions.service", () => ({
  transactionService: {
    getTransaction: vi.fn(),
    saveTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

vi.mock("./receipt-scanning.repo", () => ({
  receiptScanningRepo: {
    getMappingsByNames: vi.fn(),
  },
}));

vi.mock("./receipt-mappings.service", () => ({
  receiptMappingsService: {
    upsertMapping: vi.fn(),
  },
}));

import { productService } from "../products/products.service";
import { shoppingService } from "../shopping/shopping.service";
import { receiptScanningRepo } from "./receipt-scanning.repo";
import { receiptScanningService } from "./receipt-scanning.service";

const mockProductService = vi.mocked(productService);
const mockShoppingService = vi.mocked(shoppingService);
const mockReceiptScanningRepo = vi.mocked(receiptScanningRepo);

function makeReceipt(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    store: "Store",
    date: "2026-08-03",
    total: "20.00",
    confidence: 0.95,
    warnings: [],
    items: [
      {
        name: "PEPSI MAX 4X1.5L",
        quantity: "1",
        unitPrice: "20.00",
        lineTotal: "20.00",
        confidence: 0.9,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProductService.getProducts.mockResolvedValue([null, [makeProduct({ id: "product-1", name: "Pepsi", aliases: [] })]] as any);
  mockReceiptScanningRepo.getMappingsByNames.mockResolvedValue([] as any);
  mockShoppingService.getShoppingList.mockResolvedValue([null, { id: "list-1", items: [] }] as any);
});

describe("receiptScanningService.matchExtractedReceipt", () => {
  it("matches extracted receipt items with stored receipt mappings", async () => {
    const product = makeProduct({ id: "product-1", name: "Pepsi", aliases: [] });
    mockProductService.getProducts.mockResolvedValue([null, [product]] as any);
    mockReceiptScanningRepo.getMappingsByNames.mockResolvedValue([
      {
        id: "mapping-1",
        userId: "user-1",
        productId: "product-1",
        itemName: "PEPSI MAX 4X1.5L",
        normalizedItemName: "pepsi max 4x15l",
        confirmationCount: 1,
        lastConfirmedAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ] as any);

    const [error, result] = await receiptScanningService.matchExtractedReceipt("user-1", {
      receipt: makeReceipt(),
      mode: "transaction",
    });

    expect(error).toBeNull();
    expect(mockReceiptScanningRepo.getMappingsByNames).toHaveBeenCalledWith("user-1", ["pepsi max 4x15l"]);
    expect(result?.lines[0].product).toEqual({ id: "product-1", name: "Pepsi" });
    expect(result?.parsedDate).toEqual(new Date("2026-08-03"));
  });

  it("uses checked shopping items when matching checkout scans", async () => {
    const product = makeProduct({ id: "product-1", name: "Pepsi", aliases: [] });
    mockProductService.getProducts.mockResolvedValue([null, [product]] as any);
    mockShoppingService.getShoppingList.mockResolvedValue([
      null,
      {
        id: "list-1",
        items: [
          {
            id: "shopping-item-1",
            shoppingListId: "list-1",
            productId: "product-1",
            checked: true,
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
            product,
          },
        ],
      },
    ] as any);

    const [error, result] = await receiptScanningService.matchExtractedReceipt("user-1", {
      receipt: makeReceipt({ items: [{ name: "Pepsi", quantity: "1", unitPrice: "20.00", lineTotal: "20.00", confidence: 0.9 }] }),
      mode: "shopping-checkout",
    });

    expect(error).toBeNull();
    expect(mockShoppingService.getShoppingList).toHaveBeenCalledWith("user-1");
    expect(result?.lines[0]).toMatchObject({
      product: { id: "product-1", name: "Pepsi" },
      shoppingItemId: "shopping-item-1",
      suggestions: [],
    });
  });

  it("returns an expected error when products cannot be loaded", async () => {
    mockProductService.getProducts.mockResolvedValue([{ reason: "PRODUCTS_FAILED", message: "Nope" }, null] as any);

    const [error, result] = await receiptScanningService.matchExtractedReceipt("user-1", {
      receipt: makeReceipt(),
      mode: "transaction",
    });

    expect(result).toBeNull();
    expect(error).toMatchObject({
      reason: "SCAN_PRODUCTS_LOAD_FAILED",
      message: "Could not load products for receipt matching.",
    });
  });
});
