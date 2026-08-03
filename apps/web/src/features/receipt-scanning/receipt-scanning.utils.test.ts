import { describe, expect, it } from "vitest";
import {
  fileToDataUrl,
  formatReceiptScanStartError,
  MAX_RECEIPT_FILE_SIZE,
  RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE,
  validateReceiptFile,
} from "./receipt-scanning.utils";

class TestFileReader {
  result: string | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(file: File) {
    void file.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(buffer).toString("base64");
      this.result = `data:${file.type};base64,${base64}`;
      this.onload?.();
    }).catch((error) => {
      this.error = error;
      this.onerror?.();
    });
  }
}

globalThis.FileReader = TestFileReader as typeof FileReader;

function makeFile({ type = "image/png", size = 10, name = "receipt.png" } = {}) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateReceiptFile", () => {
  it("accepts supported receipt files under the size limit", () => {
    expect(validateReceiptFile(makeFile({ type: "image/jpeg" }))).toBeNull();
    expect(validateReceiptFile(makeFile({ type: "image/png" }))).toBeNull();
    expect(validateReceiptFile(makeFile({ type: "application/pdf", name: "receipt.pdf" }))).toBeNull();
  });

  it("rejects unsupported file types", () => {
    expect(validateReceiptFile(makeFile({ type: "text/plain", name: "receipt.txt" }))).toBe("Choose a JPEG, PNG, or PDF receipt file.");
  });

  it("rejects files over 10 MB", () => {
    expect(validateReceiptFile(makeFile({ size: MAX_RECEIPT_FILE_SIZE + 1 }))).toBe("Receipt file is too large. Choose an image or PDF under 10 MB.");
  });
});

describe("fileToDataUrl", () => {
  it("converts a file to a data URL", async () => {
    const result = await fileToDataUrl(new File(["hello"], "receipt.png", { type: "image/png" }));

    expect(result).toBe("data:image/png;base64,aGVsbG8=");
  });
});

describe("formatReceiptScanStartError", () => {
  it("replaces raw fetch failures with an actionable message", () => {
    expect(formatReceiptScanStartError(new Error("fetch failed"))).toBe(RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE);
    expect(formatReceiptScanStartError(new Error("Failed to fetch"))).toBe(RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE);
  });

  it("keeps explicit scan API messages", () => {
    expect(formatReceiptScanStartError("Daily scan limit reached. Try again tomorrow.")).toBe("Daily scan limit reached. Try again tomorrow.");
  });
});
