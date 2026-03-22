import { describe, it, expect } from "vitest";
import { transactionValidators } from "./transaction.validators";

describe("transactionValidators.editFormValidation", () => {
  const schema = transactionValidators.editFormValidation;

  it("accepts valid edit data", () => {
    const result = schema.safeParse({
      price: "42.50",
      type: "expense",
      date: "2026-01-15",
      description: "Groceries",
    });
    expect(result.success).toBe(true);
  });

  it("accepts edit data without description", () => {
    const result = schema.safeParse({
      price: "10",
      type: "income",
      date: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts edit data with empty description string", () => {
    const result = schema.safeParse({
      price: "10",
      type: "income",
      date: "2026-03-01",
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      price: "abc",
      type: "expense",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty price", () => {
    const result = schema.safeParse({
      price: "",
      type: "expense",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      price: "10",
      type: "refund",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = schema.safeParse({
      price: "10",
      type: "expense",
      date: "Jan 15, 2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts negative price (for adjustments)", () => {
    const result = schema.safeParse({
      price: "-5.00",
      type: "expense",
      date: "2026-01-15",
      description: "",
    });
    expect(result.success).toBe(true);
  });
});
