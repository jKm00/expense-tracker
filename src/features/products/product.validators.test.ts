import { describe, it, expect } from "vitest";
import { productValidators } from "./product.validators";

describe("productValidators", () => {
  describe("createFormValidation", () => {
    const schema = productValidators.createFormValidation;

    it("accepts a valid product name", () => {
      const result = schema.safeParse({ name: "Coffee" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = schema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("editFormValidation", () => {
    const schema = productValidators.editFormValidation;

    it("accepts a valid product name", () => {
      const result = schema.safeParse({ name: "Updated Coffee" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = schema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });
});
