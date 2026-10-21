import { describe, it, expect } from "vitest";
import { shortcutNeedsInput } from "./shortcuts.utils";
import { ShortcutWithProducts } from "./shortcuts.models";

const base = {
  products: [{ id: "p1", name: "A" }],
  price: "10.00",
} as ShortcutWithProducts;

describe("shortcutNeedsInput", () => {
  it("is false for one product with a fixed price", () => {
    expect(shortcutNeedsInput(base)).toBe(false);
  });

  it("is true when the price is asked for", () => {
    expect(shortcutNeedsInput({ ...base, price: null })).toBe(true);
  });

  it("is true when there are several products to choose from", () => {
    expect(
      shortcutNeedsInput({
        ...base,
        products: [...base.products, { id: "p2", name: "B" }],
      }),
    ).toBe(true);
  });
});
