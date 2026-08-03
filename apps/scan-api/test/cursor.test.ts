import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/cursor";

describe("cursor helpers", () => {
  it("round-trips opaque cursors", () => {
    const cursor = { pk: "USER#1", sk: "SCAN#2" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("ignores invalid cursors", () => {
    expect(decodeCursor("not-valid")).toBeUndefined();
  });
});
