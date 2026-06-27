// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "./product.form";
import type { ProductWithDetails } from "../products.models";

const updateProductMutate = vi.fn();

vi.mock("../products.mutations", () => ({
  productMutations: {
    updateProduct: () => ({ mutate: updateProductMutate, isPending: false }),
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

describe("ProductForm", () => {
  it("disables product actions until the product changes", () => {
    render(<ProductForm product={makeProduct()} />);

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Discard" }).disabled).toBe(true);

    fireEvent.change(screen.getByDisplayValue("Milk"), {
      target: { value: "Whole Milk" },
    });

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(false);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Discard" }).disabled).toBe(false);
  });

  it("discards unsaved product changes", () => {
    render(<ProductForm product={makeProduct()} />);

    const nameInput = screen.getByDisplayValue("Milk");
    fireEvent.change(nameInput, { target: { value: "Whole Milk" } });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByDisplayValue("Milk")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save changes" }).disabled).toBe(true);
  });
});
