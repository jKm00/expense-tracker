import { describe, expect, it } from "vitest";
import { ProductWithTag } from "../products/products.models";
import { matchReceiptToProducts } from "./receipt-matching";
import { ReceiptItemMapping } from "./receipt-scanning.models";

function makeProduct(overrides: Partial<ProductWithTag> = {}): ProductWithTag {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "product-1",
    userId: "user-1",
    name: "Pepsi",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    tags: [],
    aliases: [],
    ...overrides,
  };
}

function makeMapping(overrides: Partial<ReceiptItemMapping> = {}) {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "mapping-1",
    userId: "user-1",
    productId: "product-1",
    itemName: "PEPSI MAX 4X1.5L",
    normalizedItemName: "pepsi max 4x15l",
    confirmationCount: 1,
    lastConfirmedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } satisfies ReceiptItemMapping;
}

function makeReceipt(name: string) {
  return {
    confidence: 0.9,
    warnings: [],
    items: [
      {
        name,
        quantity: "1",
        unitPrice: "42.00",
        lineTotal: "42.00",
        confidence: 0.9,
      },
    ],
  };
}

describe("matchReceiptToProducts", () => {
  it("auto-fills exact hidden mapping matches", () => {
    const product = makeProduct();
    const result = matchReceiptToProducts({
      receipt: makeReceipt("PEPSI MAX 4X1.5L"),
      products: [product],
      mappings: [{ ...makeMapping(), product }],
    });

    expect(result.lines[0].product).toEqual({ id: "product-1", name: "Pepsi" });
    expect(result.lines[0].suggestions).toEqual([]);
  });

  it("auto-fills exact normalized product name matches", () => {
    const result = matchReceiptToProducts({
      receipt: makeReceipt("pepsi"),
      products: [makeProduct()],
      mappings: [],
    });

    expect(result.lines[0].product).toEqual({ id: "product-1", name: "Pepsi" });
  });

  it("keeps alias matches as suggestions only", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const product = makeProduct({
      aliases: [
        {
          id: "alias-1",
          productId: "product-1",
          name: "Pepsi Max",
          normalizedName: "pepsi max",
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const result = matchReceiptToProducts({
      receipt: makeReceipt("Pepsi Max"),
      products: [product],
      mappings: [],
    });

    expect(result.lines[0].product).toBeNull();
    expect(result.lines[0].suggestions[0]).toMatchObject({
      product: { id: "product-1", name: "Pepsi" },
      reason: "alias",
    });
  });

  it("prioritizes checked shopping products in suggestions", () => {
    const soda = makeProduct({ id: "soda", name: "Soda" });
    const pepsi = makeProduct({ id: "pepsi", name: "Pepsi" });
    const now = new Date("2026-01-01T00:00:00Z");

    const result = matchReceiptToProducts({
      receipt: makeReceipt("pepsi soda"),
      products: [soda, pepsi],
      mappings: [],
      shoppingItems: [
        {
          id: "item-1",
          shoppingListId: "list-1",
          productId: "pepsi",
          checked: true,
          createdAt: now,
          updatedAt: now,
          product: pepsi,
        },
      ],
    });

    expect(result.lines[0].suggestions[0].product.id).toBe("pepsi");
    expect(result.lines[0].suggestions[0].reason).toBe("shopping");
  });

  it("ignores mappings to soft-deleted products", () => {
    const product = makeProduct({ deletedAt: new Date("2026-02-01T00:00:00Z") });
    const result = matchReceiptToProducts({
      receipt: makeReceipt("PEPSI MAX 4X1.5L"),
      products: [product],
      mappings: [{ ...makeMapping(), product }],
    });

    expect(result.lines[0].product).toBeNull();
  });
});
