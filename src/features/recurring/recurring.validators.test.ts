import { describe, it, expect } from "vitest";
import { recurringValidators } from "./recurring.validators";

describe("recurringValidators.addFormValidation", () => {
  const schema = recurringValidators.addFormValidation;

  it("accepts valid add recurring data", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "42.50",
      interval: "monthly",
      type: "expense",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with optional endDate", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "weekly",
      type: "income",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts income type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "100",
      interval: "monthly",
      type: "income",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts expense type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "100",
      interval: "monthly",
      type: "expense",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "monthly",
      type: "transfer",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing productId", () => {
    const result = schema.safeParse({
      price: "10",
      interval: "monthly",
      type: "expense",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "abc",
      interval: "monthly",
      type: "expense",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid interval", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "daily",
      type: "expense",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });
});

describe("recurringValidators.formValidation", () => {
  const schema = recurringValidators.formValidation;

  it("accepts valid edit recurring data", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "42.50",
      interval: "monthly",
      type: "expense",
      startDate: new Date("2026-01-01"),
      endDate: null,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts income type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "100",
      interval: "yearly",
      type: "income",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
      endDate: null,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "monthly",
      type: "refund",
      startDate: new Date("2026-01-01"),
      endDate: null,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});
