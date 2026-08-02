import { describe, expect, it } from "vitest";
import { isValidMagicBytes, scanIdFromObjectKey } from "../src/file-validation";

describe("file validation", () => {
  it("validates supported magic bytes", () => {
    expect(isValidMagicBytes("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff]))).toBe(true);
    expect(isValidMagicBytes("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isValidMagicBytes("application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(true);
    expect(isValidMagicBytes("application/pdf", new Uint8Array([0x00, 0x50, 0x44, 0x46]))).toBe(false);
  });

  it("extracts scan ids from expected object keys", () => {
    expect(scanIdFromObjectKey("scans/abc-123/original.jpg")).toBe("abc-123");
    expect(scanIdFromObjectKey("users/abc-123/original.jpg")).toBeNull();
  });
});
