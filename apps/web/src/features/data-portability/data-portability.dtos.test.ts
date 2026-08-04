import { describe, expect, it } from "vitest";
import { dataPortabilityExportSchema } from "./data-portability.dtos";

const now = "2026-01-01T00:00:00.000Z";

function makePayload(overrides: Record<string, unknown> = {}) {
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
    },
    ...overrides,
  };
}

describe("dataPortabilityExportSchema", () => {
  it("accepts signed transaction totals", () => {
    const payload = makePayload({
      data: {
        ...makePayload().data,
        transactions: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            store: "Store",
            description: null,
            source: "manual",
            needsReview: false,
            totalPrice: "-12.50",
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    });

    expect(dataPortabilityExportSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects unknown top-level fields in v1", () => {
    const payload = makePayload({ extra: true });

    expect(dataPortabilityExportSchema.safeParse(payload).success).toBe(false);
  });
});
