import { describe, expect, it } from "vitest";
import { getPrefilledCheckoutEntries } from "./shopping-checkout.utils";

describe("getPrefilledCheckoutEntries", () => {
  it("creates one checkout entry per checked shopping item", () => {
    const list = {
      id: "list-1",
      userId: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      items: [
        {
          id: "item-1",
          shoppingListId: "list-1",
          productId: "product-1",
          checked: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          product: { id: "product-1", userId: "user-1", name: "Milk", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"), deletedAt: null },
        },
        {
          id: "item-2",
          shoppingListId: "list-1",
          productId: "product-2",
          checked: false,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          product: { id: "product-2", userId: "user-1", name: "Bread", createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"), deletedAt: null },
        },
      ],
    } as const;

    const entries = getPrefilledCheckoutEntries(list as any);

    expect(entries).toHaveLength(1);
    expect(entries[0].shoppingItemId).toBe("item-1");
    expect(entries[0].product.name).toBe("Milk");
    expect(entries[0].quantity).toBe("1");
  });
});
