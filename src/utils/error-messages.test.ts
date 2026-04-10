import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./error-messages";

describe("getErrorMessage", () => {
  it("maps NOT_FOUND reasons to 'not found' message", () => {
    expect(getErrorMessage({ reason: "TRANSACTION_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
    expect(getErrorMessage({ reason: "PRODUCT_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
    expect(getErrorMessage({ reason: "RECURRING_PRODUCT_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
  });

  it("maps FORBIDDEN reasons to 'no access' message", () => {
    expect(getErrorMessage({ reason: "TRANSACTION_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
    expect(getErrorMessage({ reason: "PRODUCT_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
    expect(getErrorMessage({ reason: "RECURRING_PRODUCT_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
  });

  it("returns generic message for unknown reasons", () => {
    expect(getErrorMessage({ reason: "UNKNOWN_ERROR" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("uses custom message if provided and reason is unknown", () => {
    expect(
      getErrorMessage({ reason: "SOME_ERROR", message: "Custom error" }),
    ).toBe("Something went wrong. Please try again.");
  });
});
