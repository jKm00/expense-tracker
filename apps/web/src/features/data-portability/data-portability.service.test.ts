import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataPortabilityExport } from "./data-portability.dtos";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  query: {
    products: {
      findMany: vi.fn(),
    },
  },
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/features/logger/logger.context", () => ({
  getLogger: () => ({ addAttrs: vi.fn() }),
}));

import { dataPortabilityService } from "./data-portability.service";

const now = "2026-01-01T00:00:00.000Z";

function emptySelect(rows: unknown[] = []) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => Promise.resolve(rows)),
    limit: vi.fn(() => Promise.resolve(rows)),
  };
  return chain;
}

function makePayload(overrides: Partial<DataPortabilityExport["data"]> = {}): DataPortabilityExport {
  return {
    format: "expense-tracker-export",
    version: 1,
    exportedAt: now,
    period: { type: "all" },
    counts: {},
    data: {
      tags: [],
      products: [],
      productAliases: [],
      productTags: [],
      transactions: [],
      entries: [],
      entryTags: [],
      recurring: [],
      receiptItemMappings: [],
      analytics: {
        chartPreferences: null,
        excludedTagIds: [],
        excludedProductIds: [],
      },
      ...overrides,
    },
  };
}

describe("dataPortabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => emptySelect());
    mockDb.query.products.findMany.mockResolvedValue([]);
  });

  it("rejects import payloads larger than 10 MB before reading the database", async () => {
    const payload = makePayload({
      tags: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "x".repeat(10 * 1024 * 1024),
          color: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

    expect(summary).toBeNull();
    expect(error?.reason).toBe("DATA_IMPORT_TOO_LARGE");
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("reports transaction total mismatches during preview", async () => {
    const payload = makePayload({
      products: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Milk",
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
      transactions: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          store: "Store",
          description: null,
          source: "manual",
          needsReview: false,
          totalPrice: "-99.00",
          date: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
      entries: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          transactionId: "33333333-3333-4333-8333-333333333333",
          productId: "22222222-2222-4222-8222-222222222222",
          price: "12.50",
          quantity: 1,
          type: "expense",
        },
      ],
    });

    const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

    expect(error).toBeNull();
    expect(summary?.errors).toEqual([
      expect.objectContaining({
        type: "transaction",
        id: "33333333-3333-4333-8333-333333333333",
      }),
    ]);
  });
});
