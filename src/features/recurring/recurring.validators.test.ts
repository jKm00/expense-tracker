import { describe, it, expect } from "vitest";
import { recurringValidators } from "./recurring.validators";

describe("recurringValidators.addFormValidation", () => {
  const schema = recurringValidators.addFormValidation;

  it("accepts valid add recurring data", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "42.50",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with optional endDate", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "weekly",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = schema.safeParse({
      price: "10",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "abc",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid interval", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "daily",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });
});
