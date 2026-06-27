// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductSelect } from "./product-select";
import type { ProductWithTag } from "@/features/products/products.models";

afterEach(() => {
  cleanup();
});

function makeProduct(overrides: Partial<ProductWithTag> = {}): ProductWithTag {
  return {
    id: "product-1",
    userId: "user-1",
    name: "Milk",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    deletedAt: null,
    tags: [],
    aliases: [],
    ...overrides,
  };
}

function openSelect() {
  fireEvent.click(screen.getByRole("button", { name: /select product/i }));
}

describe("ProductSelect", () => {
  it("hides create for exact normalized product name matches", () => {
    render(<ProductSelect products={[makeProduct({ name: "MÍLK!" })]} />);

    openSelect();
    fireEvent.change(screen.getByPlaceholderText("Search for product..."), {
      target: { value: " milk " },
    });

    expect(screen.queryByText("Create 'milk'")).toBeNull();
  });

  it("hides create for exact normalized alias matches", () => {
    render(
      <ProductSelect
        products={[
          makeProduct({
            aliases: [
              {
                id: "alias-1",
                productId: "product-1",
                name: "Whole Milk",
                normalizedName: "whole milk",
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-01"),
              },
            ],
          }),
        ]}
      />,
    );

    openSelect();
    fireEvent.change(screen.getByPlaceholderText("Search for product..."), {
      target: { value: "whole milk" },
    });

    expect(screen.queryByText("Create 'whole milk'")).toBeNull();
  });

  it("shows create for partial matches", () => {
    const onValueChange = vi.fn();
    render(
      <ProductSelect
        products={[makeProduct({ name: "Oat Milk" })]}
        onValueChange={onValueChange}
      />,
    );

    openSelect();
    fireEvent.change(screen.getByPlaceholderText("Search for product..."), {
      target: { value: "Milk" },
    });
    fireEvent.click(screen.getByText("Create 'Milk'"));

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "", name: "Milk" }),
    );
  });
});
