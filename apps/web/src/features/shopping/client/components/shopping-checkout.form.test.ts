import { describe, expect, it } from "vitest";
import { makeTransaction } from "@/features/__test-fixtures__";
import {
  getCheckoutLinkSuggestion,
  getPrefilledCheckoutEntries,
  getSelectableCheckoutTransactions,
  hasActiveIntegrationTokens,
} from "./shopping-checkout.utils";

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

describe("checkout link helpers", () => {
  it("detects active integration tokens", () => {
    expect(
      hasActiveIntegrationTokens([
        {
          id: "token-1",
          name: "Main",
          tokenPrefix: "tok",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastUsedAt: null,
          revokedAt: null,
        },
      ]),
    ).toBe(true);
  });

  it("returns the latest same-day needs review transaction as suggestion", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const older = makeTransaction({
      id: "tx-1",
      needsReview: true,
      date: new Date("2024-01-15T08:00:00Z"),
    });
    const latest = makeTransaction({
      id: "tx-2",
      needsReview: true,
      date: new Date("2024-01-15T10:00:00Z"),
    });
    const otherDay = makeTransaction({
      id: "tx-3",
      needsReview: true,
      date: new Date("2024-01-16T10:00:00Z"),
    });

    expect(
      getCheckoutLinkSuggestion([older, latest, otherDay] as any, date)?.id,
    ).toBe("tx-2");
  });

  it("returns same-day transactions for manual selection", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const sameDay = makeTransaction({ id: "tx-1", date: new Date("2024-01-15T10:00:00Z") });
    const otherDay = makeTransaction({ id: "tx-2", date: new Date("2024-01-16T10:00:00Z") });

    expect(
      getSelectableCheckoutTransactions([sameDay, otherDay] as any, date).map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["tx-1"]);
  });
});
