// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductAliasManager } from "./product-alias-manager";
import type { ProductWithDetails } from "../products.models";

const addProductAliasMutate = vi.fn();
const updateProductAliasMutate = vi.fn();
const deleteProductAliasMutate = vi.fn();

vi.mock("../products.mutations", () => ({
  productMutations: {
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

function makeProductWithAlias() {
  return makeProduct({
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
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ProductAliasManager", () => {
  it("renders alias management controls directly", () => {
    render(<ProductAliasManager product={makeProductWithAlias()} />);

    expect(screen.getByPlaceholderText("Whole milk, Skim milk...")).toBeTruthy();
    expect(screen.getByText("Whole Milk")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy();
  });

  it("disables alias save until the alias changes", () => {
    render(<ProductAliasManager product={makeProductWithAlias()} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const aliasInput = screen.getByDisplayValue("Whole Milk");
    const saveButton = screen.getByRole<HTMLButtonElement>("button", { name: "Save" });
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(aliasInput, { target: { value: "Whole Milk 2" } });

    expect(saveButton.disabled).toBe(false);
  });
});
