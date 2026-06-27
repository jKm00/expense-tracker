import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const attempts: any[] = [];

vi.mock("./receipt-scanning.repo", () => ({
  receiptScanningRepo: {
    withTransaction: vi.fn(async (callback) => callback({ tx: true })),
    lockDailyAttempts: vi.fn(),
    getExtractionAttemptsSince: vi.fn(async (_userId: string, since: Date) =>
      attempts.filter((attempt) => attempt.createdAt >= since),
    ),
    saveAttempt: vi.fn(async (attempt) => {
      const saved = {
        id: `attempt-${attempts.length + 1}`,
        itemCount: null,
        durationMs: null,
        errorCategory: null,
        createdAt: new Date(),
        ...attempt,
      };
      attempts.push(saved);
      return [saved];
    }),
    updateAttempt: vi.fn(async (attemptId, data) => {
      const attempt = attempts.find((row) => row.id === attemptId);
      if (!attempt) return [];
      Object.assign(attempt, data);
      return [attempt];
    }),
    getMappingsByNames: vi.fn(async () => []),
  },
}));

vi.mock("./receipt-openai.adapter", () => ({
  extractReceiptWithOpenAI: vi.fn(),
}));

vi.mock("../products/products.service", () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("../shopping/shopping.service", () => ({
  shoppingService: {
    getShoppingList: vi.fn(),
    removeShoppingItem: vi.fn(),
  },
}));

vi.mock("../transactions/transactions.service", () => ({
  transactionService: {
    getTransaction: vi.fn(),
    saveTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

vi.mock("./receipt-mappings.service", () => ({
  receiptMappingsService: {
    upsertMapping: vi.fn(),
  },
}));

import { productService } from "../products/products.service";
import { receiptScanningService } from "./receipt-scanning.service";
import { extractReceiptWithOpenAI } from "./receipt-openai.adapter";

const mockProductService = vi.mocked(productService);
const mockExtractReceiptWithOpenAI = vi.mocked(extractReceiptWithOpenAI);

function makeAttempt(overrides: Partial<any>) {
  return {
    id: `attempt-${attempts.length + 1}`,
    userId: "user-1",
    provider: "openai",
    status: "success",
    itemCount: null,
    durationMs: null,
    errorCategory: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeProduct(overrides: Partial<any> = {}) {
  return {
    id: "product-1",
    userId: "user-1",
    name: "Milk",
    deletedAt: null,
    tags: [],
    aliases: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));
  vi.clearAllMocks();
  attempts.length = 0;
  mockProductService.getProducts.mockResolvedValue([null, [makeProduct()]] as any);
  mockExtractReceiptWithOpenAI.mockResolvedValue({
    store: "Store",
    date: "2026-06-27",
    confidence: 1,
    warnings: [],
    items: [
      {
        name: "Milk",
        quantity: "1",
        unitPrice: "10.00",
        lineTotal: "10.00",
        confidence: 1,
      },
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("receiptScanningService quota", () => {
  it("counts success and non-stale in_progress attempts only", async () => {
    attempts.push(
      makeAttempt({ id: "success", status: "success" }),
      makeAttempt({ id: "active", status: "in_progress" }),
      makeAttempt({
        id: "stale",
        status: "in_progress",
        createdAt: new Date("2026-06-27T11:44:59.000Z"),
      }),
      makeAttempt({ id: "failed", status: "failed" }),
      makeAttempt({ id: "rate-limited", status: "rate_limited" }),
      makeAttempt({ id: "rejected", status: "rejected" }),
    );

    const [error, usage] = await receiptScanningService.getScanUsage("user-1");

    expect(error).toBeNull();
    expect(usage).toEqual({ used: 2, limit: 5, remaining: 3 });
  });

  it("reserves an in_progress attempt before extracting and marks it success", async () => {
    const [error, result] = await receiptScanningService.extractReceipt("user-1", {
      imageDataUrl: "data:image/png;base64,abc",
      mode: "transaction",
    });

    expect(error).toBeNull();
    expect(result?.lines).toHaveLength(1);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      status: "success",
      itemCount: 1,
      errorCategory: null,
    });
    expect(mockExtractReceiptWithOpenAI).toHaveBeenCalledOnce();
  });

  it("logs rate_limited and skips extraction when success plus active attempts reach the limit", async () => {
    attempts.push(
      makeAttempt({ id: "success-1", status: "success" }),
      makeAttempt({ id: "success-2", status: "success" }),
      makeAttempt({ id: "success-3", status: "success" }),
      makeAttempt({ id: "success-4", status: "success" }),
      makeAttempt({ id: "active", status: "in_progress" }),
    );

    const [error, result] = await receiptScanningService.extractReceipt("user-1", {
      imageDataUrl: "data:image/png;base64,abc",
      mode: "transaction",
    });

    expect(result).toBeNull();
    expect(error?.reason).toBe("SCAN_RATE_LIMITED");
    expect(attempts.at(-1)).toMatchObject({
      status: "rate_limited",
      errorCategory: "rate_limit",
    });
    expect(mockExtractReceiptWithOpenAI).not.toHaveBeenCalled();
  });

  it("marks provider errors failed and does not count them in usage", async () => {
    mockExtractReceiptWithOpenAI.mockRejectedValue(new Error("OPENAI_HTTP_500"));

    const [error, result] = await receiptScanningService.extractReceipt("user-1", {
      imageDataUrl: "data:image/png;base64,abc",
      mode: "transaction",
    });
    const [, usage] = await receiptScanningService.getScanUsage("user-1");

    expect(result).toBeNull();
    expect(error?.reason).toBe("SCAN_EXTRACTION_FAILED");
    expect(attempts[0]).toMatchObject({
      status: "failed",
      errorCategory: "provider_http",
    });
    expect(usage?.used).toBe(0);
  });
});
