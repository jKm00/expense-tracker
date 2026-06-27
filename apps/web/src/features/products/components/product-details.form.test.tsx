// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDetailsForm } from "./product-details.form";
import type { ProductWithDetails } from "../products.models";

const updateProductMutate = vi.fn();
const addProductAliasMutate = vi.fn();
const updateProductAliasMutate = vi.fn();
const deleteProductAliasMutate = vi.fn();

vi.mock("../products.mutations", () => ({
  productMutations: {
    updateProduct: () => ({ mutate: updateProductMutate, isPending: false }),
    addProductAlias: () => ({ mutate: addProductAliasMutate, isPending: false }),
    updateProductAlias: () => ({ mutate: updateProductAliasMutate, isPending: false }),
    deleteProductAlias: () => ({ mutate: deleteProductAliasMutate, isPending: false }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function makeProduct(overrides: Partial<ProductWithDetails> = {}): ProductWithDetails {
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ProductDetailsForm", () => {
  it("disables product name actions until the name changes", () => {
    render(<ProductDetailsForm product={makeProduct()} />);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Discard" }).disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("Milk"), {
      target: { value: "Whole Milk" },
    });

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(false);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Discard" }).disabled).toBe(false);
  });

  it("discards unsaved product name changes", () => {
    render(<ProductDetailsForm product={makeProduct()} />);

    const nameInput = screen.getByDisplayValue("Milk");
    fireEvent.change(nameInput, { target: { value: "Whole Milk" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByDisplayValue("Milk")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
  });

  it("renders alias management controls directly", () => {
    render(
      <ProductDetailsForm
        product={makeProduct({
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
        })}
      />,
    );

    expect(screen.getByPlaceholderText("Whole milk, Skim milk...")).toBeTruthy();
    expect(screen.getByText("Whole Milk")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy();
  });

  it("disables alias save until the alias changes", () => {
    render(
      <ProductDetailsForm
        product={makeProduct({
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
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const aliasInput = screen.getByDisplayValue("Whole Milk");
    const saveButtons = screen.getAllByRole<HTMLButtonElement>("button", { name: "Save" });
    expect(saveButtons[0].disabled).toBe(true);

    fireEvent.change(aliasInput, { target: { value: "Whole Milk 2" } });

    expect(saveButtons[0].disabled).toBe(false);
  });
});
