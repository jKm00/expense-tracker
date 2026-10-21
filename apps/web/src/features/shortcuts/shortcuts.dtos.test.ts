import { describe, it, expect } from "vitest";
import { createShortcutSchema } from "./shortcuts.dtos";

const valid = { name: "Lunch", type: "expense", productIds: ["p1"] };

describe("createShortcutSchema", () => {
  it("accepts a shortcut without a price", () => {
    expect(createShortcutSchema.safeParse(valid).success).toBe(true);
    expect(
      createShortcutSchema.safeParse({ ...valid, price: null }).success,
    ).toBe(true);
  });

  it("accepts a positive price", () => {
    expect(
      createShortcutSchema.safeParse({ ...valid, price: "12.50" }).success,
    ).toBe(true);
  });

  it("rejects an invalid price, empty name and no products", () => {
    expect(
      createShortcutSchema.safeParse({ ...valid, price: "-5" }).success,
    ).toBe(false);
    expect(createShortcutSchema.safeParse({ ...valid, name: "  " }).success).toBe(
      false,
    );
    expect(
      createShortcutSchema.safeParse({ ...valid, productIds: [] }).success,
    ).toBe(false);
  });
});
