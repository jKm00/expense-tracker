import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsV2EntryRow } from "./analytics-v2.models";

vi.mock("./analytics-v2.repo", () => ({
  analyticsV2Repo: {
    getEntryRows: vi.fn(),
  },
}));

vi.mock("../products/products.service", () => ({
  productService: {
    getProductTagRows: vi.fn(),
  },
}));

import { analyticsV2Repo } from "./analytics-v2.repo";
import { analyticsV2Service } from "./analytics-v2.service";
import { productService } from "../products/products.service";

const mockAnalyticsV2Repo = vi.mocked(analyticsV2Repo);
const mockProductService = vi.mocked(productService);

const fixedTag = {
  productId: "product-rent",
  tagId: "tag-fixed",
  tagName: "Fixed",
  tagColor: "#475569",
};

const funTag = {
  productId: "product-coffee",
  tagId: "tag-fun",
  tagName: "Fun",
  tagColor: "#f97316",
};

function makeEntryRow(
  overrides: Partial<AnalyticsV2EntryRow> = {},
): AnalyticsV2EntryRow {
  return {
    id: "entry-1",
    transactionId: "transaction-1",
    price: "10",
    quantity: 1,
    type: "expense",
    date: new Date("2024-01-01T12:00:00.000Z"),
    store: "Store",
    description: null,
    source: "manual",
    needsReview: false,
    productId: "product-1",
    productName: "Product",
    tagId: null,
    tagName: null,
    tagColor: null,
    ...overrides,
  };
}

function periodRows() {
  return [
    makeEntryRow({
      id: "entry-rent",
      transactionId: "transaction-rent",
      price: "-1200",
      type: "expense",
      date: new Date("2024-01-02T12:00:00.000Z"),
      store: "Landlord",
      source: "recurring",
      productId: "product-rent",
      productName: "Rent",
    }),
    makeEntryRow({
      id: "entry-salary",
      transactionId: "transaction-salary",
      price: "5000",
      type: "income",
      date: new Date("2024-01-05T12:00:00.000Z"),
      store: "Employer",
      source: "recurring",
      productId: "product-salary",
      productName: "Salary",
    }),
    makeEntryRow({
      id: "entry-groceries",
      transactionId: "transaction-groceries",
      price: "-50",
      quantity: 2,
      type: "expense",
      date: new Date("2024-01-06T12:00:00.000Z"),
      store: "Grocery Store",
      productId: "product-groceries",
      productName: "Groceries",
      tagId: "tag-food",
      tagName: "Food",
      tagColor: "#22c55e",
    }),
    makeEntryRow({
      id: "entry-coffee",
      transactionId: "transaction-coffee",
      price: "-20",
      type: "expense",
      date: new Date("2024-01-07T12:00:00.000Z"),
      store: "Coffee Bar",
      source: "integration",
      needsReview: true,
      productId: "product-coffee",
      productName: "Coffee",
    }),
  ];
}

function comparisonRows() {
  return [
    makeEntryRow({
      id: "entry-dec-salary",
      transactionId: "transaction-dec-salary",
      price: "4000",
      type: "income",
      date: new Date("2023-12-05T12:00:00.000Z"),
      productId: "product-salary",
      productName: "Salary",
    }),
    makeEntryRow({
      id: "entry-dec-rent",
      transactionId: "transaction-dec-rent",
      price: "-1000",
      type: "expense",
      date: new Date("2023-12-02T12:00:00.000Z"),
      source: "recurring",
      productId: "product-rent",
      productName: "Rent",
    }),
  ];
}

function mockDashboardDependencies(options: {
  rows?: AnalyticsV2EntryRow[];
  previousRows?: AnalyticsV2EntryRow[];
  productTags?: typeof fixedTag[];
  previousProductTags?: typeof fixedTag[];
} = {}) {
  mockAnalyticsV2Repo.getEntryRows
    .mockResolvedValueOnce(options.rows ?? periodRows())
    .mockResolvedValueOnce(options.previousRows ?? comparisonRows());
  mockProductService.getProductTagRows
    .mockResolvedValueOnce([null, options.productTags ?? [fixedTag, funTag]])
    .mockResolvedValueOnce([null, options.previousProductTags ?? [fixedTag]]);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("analyticsV2Service", () => {
  describe("getDashboardData", () => {
    it("builds dashboard metrics and breakdowns for the selected month", async () => {
      mockDashboardDependencies();

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
        0,
      );

      expect(error).toBeNull();
      expect(dashboard?.period).toEqual({
        start: "2024-01-01",
        end: "2024-01-31",
        label: "January 2024",
        isYearly: false,
      });
      expect(mockAnalyticsV2Repo.getEntryRows).toHaveBeenNthCalledWith(
        1,
        "user-1",
        expect.objectContaining({ isYearly: false }),
      );
      expect(mockProductService.getProductTagRows).toHaveBeenNthCalledWith(
        1,
        "user-1",
        ["product-rent", "product-salary", "product-groceries", "product-coffee"],
      );

      expect(dashboard?.kpis).toMatchObject({
        totalIncome: 5000,
        totalExpense: 1320,
        netFlow: 3680,
        recurringExpense: 1200,
        variableExpense: 120,
        transactionCount: 4,
        needsReviewCount: 1,
        largestExpense: 1200,
        averageTransactionExpense: 330,
      });
      expect(dashboard?.comparisonKpis).toMatchObject({
        totalIncome: 4000,
        totalExpense: 1000,
      });
      expect(dashboard?.deltas).toMatchObject({
        netFlow: 680,
        totalExpense: 320,
      });
      expect(dashboard?.availableTags.map((tag) => tag.id)).toEqual([
        "tag-fixed",
        "tag-food",
        "tag-fun",
      ]);
      expect(dashboard?.categoryBreakdown).toEqual([
        expect.objectContaining({ id: "tag-fixed", amount: 1200 }),
        expect.objectContaining({ id: "tag-food", amount: 100 }),
        expect.objectContaining({ id: "tag-fun", amount: 20 }),
      ]);
      expect(dashboard?.topStores[0]).toEqual(
        expect.objectContaining({
          name: "Landlord",
          amount: 1200,
          average: 1200,
        }),
      );
      expect(dashboard?.topProducts[0]).toEqual(
        expect.objectContaining({
          id: "product-rent",
          amount: 1200,
        }),
      );
      expect(dashboard?.sourceBreakdown).toEqual([
        { source: "recurring", amount: 1200, count: 1 },
        { source: "manual", amount: 100, count: 1 },
        { source: "integration", amount: 20, count: 1 },
      ]);
      expect(dashboard?.weekdayBreakdown[1]).toEqual({
        day: "Tue",
        amount: 1200,
        count: 1,
        average: 1200,
      });
      expect(dashboard?.transactionDrilldown[0]).toEqual(
        expect.objectContaining({
          id: "transaction-rent",
          expense: 1200,
          netFlow: -1200,
          tags: [expect.objectContaining({ id: "tag-fixed" })],
        }),
      );
      expect(dashboard?.trends.find((bucket) => bucket.key === "2024-01-05"))
        .toEqual(expect.objectContaining({ income: 5000, expense: 0 }));
      expect(dashboard?.insights.map((insight) => insight.title)).toContain(
        "Spending is up",
      );
    });

    it("filters dashboard payload by selected tags without shrinking available tags", async () => {
      mockDashboardDependencies();

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
        0,
        ["tag-food"],
      );

      expect(error).toBeNull();
      expect(dashboard?.selectedTagIds).toEqual(["tag-food"]);
      expect(dashboard?.availableTags.map((tag) => tag.id)).toEqual([
        "tag-fixed",
        "tag-food",
        "tag-fun",
      ]);
      expect(dashboard?.kpis).toMatchObject({
        totalIncome: 0,
        totalExpense: 100,
        netFlow: -100,
        transactionCount: 1,
      });
      expect(dashboard?.categoryBreakdown).toEqual([
        expect.objectContaining({ id: "tag-food", amount: 100, percent: 100 }),
      ]);
      expect(dashboard?.transactionDrilldown).toHaveLength(1);
      expect(dashboard?.transactionDrilldown[0]).toEqual(
        expect.objectContaining({ id: "transaction-groceries" }),
      );
    });

    it("uses the untagged fallback when an entry has no entry or product tags", async () => {
      mockDashboardDependencies({
        rows: [
          makeEntryRow({
            id: "entry-untagged",
            transactionId: "transaction-untagged",
            price: "-15",
            productId: "product-untagged",
            productName: "Mystery",
          }),
        ],
        previousRows: [],
        productTags: [],
        previousProductTags: [],
      });

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
        0,
      );

      expect(error).toBeNull();
      expect(dashboard?.availableTags).toEqual([
        { id: "untagged", name: "Untagged", color: "#94a3b8", amount: 15 },
      ]);
      expect(dashboard?.categoryBreakdown).toEqual([
        expect.objectContaining({
          id: "untagged",
          amount: 15,
          percent: 100,
        }),
      ]);
    });

    it("builds yearly periods when month is omitted", async () => {
      mockDashboardDependencies({ rows: [], previousRows: [] });

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
      );

      expect(error).toBeNull();
      expect(dashboard?.period).toEqual({
        start: "2024-01-01",
        end: "2024-12-31",
        label: "2024",
        isYearly: true,
      });
      expect(mockAnalyticsV2Repo.getEntryRows).toHaveBeenNthCalledWith(
        1,
        "user-1",
        expect.objectContaining({ isYearly: true }),
      );
      const [, period] = mockAnalyticsV2Repo.getEntryRows.mock.calls[0];
      expect(period.startDate.getFullYear()).toBe(2024);
      expect(period.startDate.getMonth()).toBe(0);
      expect(period.startDate.getDate()).toBe(1);
      expect(period.endDate.getFullYear()).toBe(2024);
      expect(period.endDate.getMonth()).toBe(11);
      expect(period.endDate.getDate()).toBe(31);
      expect(dashboard?.trends).toHaveLength(12);
    });

    it("returns ANALYTICS_V2_ERROR when the repo throws", async () => {
      mockAnalyticsV2Repo.getEntryRows.mockRejectedValue(new Error("DB error"));

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
        0,
      );

      expect(dashboard).toBeNull();
      expect(error).toEqual({
        reason: "ANALYTICS_V2_ERROR",
        message: "Failed to fetch analytics v2 dashboard data",
      });
    });

    it("returns ANALYTICS_V2_ERROR when product tag lookup fails", async () => {
      mockAnalyticsV2Repo.getEntryRows
        .mockResolvedValueOnce(periodRows())
        .mockResolvedValueOnce(comparisonRows());
      mockProductService.getProductTagRows.mockResolvedValueOnce([
        {
          reason: "PRODUCT_DB_ERROR",
          message: "Failed to fetch product tags",
        },
        null,
      ]);

      const [error, dashboard] = await analyticsV2Service.getDashboardData(
        "user-1",
        2024,
        0,
      );

      expect(dashboard).toBeNull();
      expect(error?.reason).toBe("ANALYTICS_V2_ERROR");
    });
  });
});
