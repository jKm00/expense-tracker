import { describe, expect, it } from "vitest";
import { toCapitalized } from "./typography";

describe("toCapitalized", () => {
  it("capitalizes shopping", () => {
    expect(toCapitalized("shopping")).toBe("Shopping");
  });
});
