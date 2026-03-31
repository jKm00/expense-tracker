import { describe, it, expect } from "vitest";
import type { EnrichedTransaction } from "./analytics.types";
import type { ProductWithTags } from "../products/product.models";
import type { Product } from "../products/product.models";
import type { Tag } from "../tags/tag.models";
import type { Transaction } from "../transactions/transaction.models";
import {
  enrichTransactionsWithTags,
  filterByTags,
  computeMetrics,
  computeDelta,
  groupByDay,
  groupByTag,
  getTopProducts,
} from "./analytics.utils";

// --- Test Fixtures ---

const tag1: Tag = {
  id: "tag-1",
  userId: "user-1",
  name: "Groceries",
  color: "#4CAF50",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const tag2: Tag = {
  id: "tag-2",
  userId: "user-1",
  name: "Entertainment",
  color: "#2196F3",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const tag3: Tag = {
  id: "tag-3",
  userId: "user-1",
  name: "Transport",
  color: "#FF9800",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const productA: Product = {
  id: "prod-a",
  userId: "user-1",
  name: "Supermarket",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const productB: Product = {
  id: "prod-b",
  userId: "user-1",
  name: "Cinema",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const productC: Product = {
  id: "prod-c",
  userId: "user-1",
  name: "Bus Pass",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const productD: Product = {
  id: "prod-d",
  userId: "user-1",
  name: "Coffee Shop",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const productsWithTags: ProductWithTags[] = [
  { ...productA, tags: [tag1] },           // Supermarket → Groceries
  { ...productB, tags: [tag2] },           // Cinema → Entertainment
  { ...productC, tags: [tag3] },           // Bus Pass → Transport
  { ...productD, tags: [] },               // Coffee Shop → no tags
];

function makeTx(
  overrides: Partial<Transaction> & { id: string; price: string; type: "income" | "expense"; date: Date },
): Transaction {
  return {
    userId: "user-1",
    productId: "prod-a",
    source: "manual",
    description: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  } as Transaction;
}

// --- enrichTransactionsWithTags ---

describe("enrichTransactionsWithTags", () => {
  it("maps tags from ProductWithTags to each transaction's product", () => {
    const transactions = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA },
      { transaction: makeTx({ id: "t2", price: "20.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-b" }), product: productB },
    ];

    const result = enrichTransactionsWithTags(transactions, productsWithTags);

    expect(result).toHaveLength(2);
    expect(result[0].tags).toEqual([tag1]); // Supermarket → Groceries
    expect(result[1].tags).toEqual([tag2]); // Cinema → Entertainment
  });

  it("returns empty tags array when product is null", () => {
    const transactions = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-x" }), product: null },
    ];

    const result = enrichTransactionsWithTags(transactions, productsWithTags);

    expect(result[0].tags).toEqual([]);
    expect(result[0].product).toBeNull();
  });

  it("returns empty tags array when product not found in products list", () => {
    const unknownProduct: Product = { id: "prod-unknown", userId: "user-1", name: "Unknown", createdAt: new Date(), updatedAt: new Date() };
    const transactions = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-unknown" }), product: unknownProduct },
    ];

    const result = enrichTransactionsWithTags(transactions, productsWithTags);

    expect(result[0].tags).toEqual([]);
    expect(result[0].product).toEqual(unknownProduct);
  });

  it("handles product with no tags (empty tags array in ProductWithTags)", () => {
    const transactions = [
      { transaction: makeTx({ id: "t1", price: "5.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-d" }), product: productD },
    ];

    const result = enrichTransactionsWithTags(transactions, productsWithTags);

    expect(result[0].tags).toEqual([]);
    expect(result[0].product).toEqual(productD);
  });
});

// --- filterByTags ---

describe("filterByTags", () => {
  const enriched: EnrichedTransaction[] = [
    { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [tag1] },
    { transaction: makeTx({ id: "t2", price: "20.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-b" }), product: productB, tags: [tag2] },
    { transaction: makeTx({ id: "t3", price: "30.00", type: "expense", date: new Date("2026-03-03"), productId: "prod-c" }), product: productC, tags: [tag3] },
    { transaction: makeTx({ id: "t4", price: "5.00", type: "expense", date: new Date("2026-03-04"), productId: "prod-d" }), product: productD, tags: [] },
    { transaction: makeTx({ id: "t5", price: "15.00", type: "expense", date: new Date("2026-03-05"), productId: "prod-x" }), product: null, tags: [] },
  ];

  it("returns all transactions when no filters are set", () => {
    const result = filterByTags(enriched, [], []);
    expect(result).toHaveLength(5);
  });

  it("includes only transactions matching include tags", () => {
    const result = filterByTags(enriched, ["tag-1"], []);
    expect(result).toHaveLength(1);
    expect(result[0].transaction.id).toBe("t1");
  });

  it("includes transactions matching ANY of the include tags (OR logic)", () => {
    const result = filterByTags(enriched, ["tag-1", "tag-2"], []);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.transaction.id)).toEqual(["t1", "t2"]);
  });

  it("excludes untagged transactions when includeTags is non-empty", () => {
    const result = filterByTags(enriched, ["tag-1"], []);
    expect(result.every((t) => t.tags.length > 0)).toBe(true);
  });

  it("excludes transactions matching exclude tags", () => {
    const result = filterByTags(enriched, [], ["tag-2"]);
    expect(result).toHaveLength(4);
    expect(result.find((t) => t.transaction.id === "t2")).toBeUndefined();
  });

  it("keeps untagged transactions when only excludeTags is set", () => {
    const result = filterByTags(enriched, [], ["tag-1"]);
    expect(result.find((t) => t.transaction.id === "t4")).toBeDefined();
    expect(result.find((t) => t.transaction.id === "t5")).toBeDefined();
  });

  it("applies both include and exclude (exclude applied after include)", () => {
    const result = filterByTags(enriched, ["tag-1", "tag-2"], ["tag-2"]);
    expect(result).toHaveLength(1);
    expect(result[0].transaction.id).toBe("t1");
  });

  it("exclude wins when same tag is in both include and exclude", () => {
    const result = filterByTags(enriched, ["tag-1"], ["tag-1"]);
    expect(result).toHaveLength(0);
  });
});

// --- computeMetrics ---

describe("computeMetrics", () => {
  it("computes correct sums for mixed income and expense transactions", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.50", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [tag1] },
      { transaction: makeTx({ id: "t2", price: "200.00", type: "expense", date: new Date("2026-03-15"), productId: "prod-b" }), product: productB, tags: [tag2] },
      { transaction: makeTx({ id: "t3", price: "500.00", type: "income", date: new Date("2026-03-01"), productId: "prod-c" }), product: productC, tags: [tag3] },
    ];

    const metrics = computeMetrics(transactions, 31);

    expect(metrics.totalExpenses).toBeCloseTo(300.50);
    expect(metrics.totalIncome).toBeCloseTo(500.00);
    expect(metrics.netBalance).toBeCloseTo(199.50);
    expect(metrics.transactionCount).toBe(3);
    expect(metrics.dailyAverage).toBeCloseTo(300.50 / 31);
  });

  it("identifies the biggest expense with product name", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "50.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t2", price: "200.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-b" }), product: productB, tags: [] },
      { transaction: makeTx({ id: "t3", price: "100.00", type: "expense", date: new Date("2026-03-03"), productId: "prod-c" }), product: productC, tags: [] },
    ];

    const metrics = computeMetrics(transactions, 31);

    expect(metrics.biggestExpense).toEqual({ amount: 200.00, productName: "Cinema" });
  });

  it("uses 'Unknown product' when biggest expense has null product", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-x" }), product: null, tags: [] },
    ];

    const metrics = computeMetrics(transactions, 31);

    expect(metrics.biggestExpense).toEqual({ amount: 100.00, productName: "Unknown product" });
  });

  it("returns null biggestExpense when no expense transactions exist", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "500.00", type: "income", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [] },
    ];

    const metrics = computeMetrics(transactions, 31);

    expect(metrics.biggestExpense).toBeNull();
  });

  it("returns zeroes for empty transaction list", () => {
    const metrics = computeMetrics([], 31);

    expect(metrics.totalExpenses).toBe(0);
    expect(metrics.totalIncome).toBe(0);
    expect(metrics.netBalance).toBe(0);
    expect(metrics.transactionCount).toBe(0);
    expect(metrics.dailyAverage).toBe(0);
    expect(metrics.biggestExpense).toBeNull();
  });
});

// --- computeDelta ---

describe("computeDelta", () => {
  it("computes positive delta (current > comparison)", () => {
    const delta = computeDelta(150, 100);

    expect(delta.absolute).toBe(50);
    expect(delta.percentage).toBeCloseTo(50);
    expect(delta.direction).toBe("up");
    expect(delta.favorable).toBe(true);
  });

  it("computes negative delta (current < comparison)", () => {
    const delta = computeDelta(80, 100);

    expect(delta.absolute).toBe(-20);
    expect(delta.percentage).toBeCloseTo(-20);
    expect(delta.direction).toBe("down");
    expect(delta.favorable).toBe(false);
  });

  it("returns neutral when values are equal", () => {
    const delta = computeDelta(100, 100);

    expect(delta.absolute).toBe(0);
    expect(delta.percentage).toBe(0);
    expect(delta.direction).toBe("neutral");
  });

  it("inverts favorable flag when invertFavorable is true (for expenses)", () => {
    const delta = computeDelta(80, 100, true);

    expect(delta.direction).toBe("down");
    expect(delta.favorable).toBe(true);
  });

  it("handles comparison value of 0 (avoids division by zero)", () => {
    const delta = computeDelta(100, 0);

    expect(delta.absolute).toBe(100);
    expect(delta.percentage).toBe(0);
    expect(delta.direction).toBe("up");
  });

  it("handles both values being 0", () => {
    const delta = computeDelta(0, 0);

    expect(delta.absolute).toBe(0);
    expect(delta.percentage).toBe(0);
    expect(delta.direction).toBe("neutral");
  });
});

// --- groupByDay ---

describe("groupByDay", () => {
  it("groups transactions by day of month", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date(2026, 2, 1, 10, 0), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t2", price: "20.00", type: "expense", date: new Date(2026, 2, 1, 14, 0), productId: "prod-b" }), product: productB, tags: [] },
      { transaction: makeTx({ id: "t3", price: "50.00", type: "income", date: new Date(2026, 2, 5, 9, 0), productId: "prod-c" }), product: productC, tags: [] },
    ];

    const result = groupByDay(transactions, 2026, 2);

    expect(result).toHaveLength(31);
    expect(result[0]).toEqual({ day: 1, expenses: 30, income: 0 });
    expect(result[4]).toEqual({ day: 5, expenses: 0, income: 50 });
    expect(result[1]).toEqual({ day: 2, expenses: 0, income: 0 });
  });

  it("creates entries for all days in month including days with no transactions", () => {
    const result = groupByDay([], 2026, 1);

    expect(result).toHaveLength(28);
    expect(result.every((d) => d.expenses === 0 && d.income === 0)).toBe(true);
  });

  it("handles months with different day counts", () => {
    expect(groupByDay([], 2026, 0)).toHaveLength(31);
    expect(groupByDay([], 2026, 1)).toHaveLength(28);
    expect(groupByDay([], 2026, 3)).toHaveLength(30);
  });
});

// --- groupByTag ---

describe("groupByTag", () => {
  it("groups expense amounts by tag", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [tag1] },
      { transaction: makeTx({ id: "t2", price: "20.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-a" }), product: productA, tags: [tag1] },
      { transaction: makeTx({ id: "t3", price: "30.00", type: "expense", date: new Date("2026-03-03"), productId: "prod-b" }), product: productB, tags: [tag2] },
    ];

    const result = groupByTag(transactions);

    expect(result).toHaveLength(2);
    const groceries = result.find((d) => d.tagId === "tag-1");
    expect(groceries).toEqual({
      tagId: "tag-1",
      tagName: "Groceries",
      tagColor: "#4CAF50",
      amount: 30,
    });
    const entertainment = result.find((d) => d.tagId === "tag-2");
    expect(entertainment).toEqual({
      tagId: "tag-2",
      tagName: "Entertainment",
      tagColor: "#2196F3",
      amount: 30,
    });
  });

  it("creates an 'Untagged' bucket for transactions with no tags", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "10.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-d" }), product: productD, tags: [] },
      { transaction: makeTx({ id: "t2", price: "5.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-x" }), product: null, tags: [] },
    ];

    const result = groupByTag(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].tagId).toBe("untagged");
    expect(result[0].tagName).toBe("Untagged");
    expect(result[0].amount).toBe(15);
  });

  it("counts multi-tag transactions under each tag", () => {
    const multiTagTx: EnrichedTransaction = {
      transaction: makeTx({ id: "t1", price: "40.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }),
      product: productA,
      tags: [tag1, tag2],
    };

    const result = groupByTag([multiTagTx]);

    expect(result).toHaveLength(2);
    expect(result.find((d) => d.tagId === "tag-1")?.amount).toBe(40);
    expect(result.find((d) => d.tagId === "tag-2")?.amount).toBe(40);
  });

  it("ignores income transactions (only groups expenses)", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "income", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [tag1] },
      { transaction: makeTx({ id: "t2", price: "50.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-a" }), product: productA, tags: [tag1] },
    ];

    const result = groupByTag(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(50);
  });

  it("returns empty array when no expense transactions exist", () => {
    const result = groupByTag([]);
    expect(result).toEqual([]);
  });
});

// --- getTopProducts ---

describe("getTopProducts", () => {
  it("returns top N products sorted by expense amount descending", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t2", price: "50.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t3", price: "200.00", type: "expense", date: new Date("2026-03-03"), productId: "prod-b" }), product: productB, tags: [] },
      { transaction: makeTx({ id: "t4", price: "80.00", type: "expense", date: new Date("2026-03-04"), productId: "prod-c" }), product: productC, tags: [] },
    ];

    const result = getTopProducts(transactions, null, 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ productId: "prod-b", productName: "Cinema", amount: 200 });
    expect(result[1]).toEqual({ productId: "prod-a", productName: "Supermarket", amount: 150 });
  });

  it("computes comparison amounts for the SAME products as current top N", () => {
    const current: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t2", price: "200.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-b" }), product: productB, tags: [] },
    ];
    const comparison: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "c1", price: "80.00", type: "expense", date: new Date("2026-02-01"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "c2", price: "300.00", type: "expense", date: new Date("2026-02-02"), productId: "prod-c" }), product: productC, tags: [] },
    ];

    const result = getTopProducts(current, comparison, 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ productId: "prod-b", productName: "Cinema", amount: 200, comparisonAmount: 0 });
    expect(result[1]).toEqual({ productId: "prod-a", productName: "Supermarket", amount: 100, comparisonAmount: 80 });
  });

  it("ignores income transactions", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "income", date: new Date("2026-03-01"), productId: "prod-a" }), product: productA, tags: [] },
      { transaction: makeTx({ id: "t2", price: "50.00", type: "expense", date: new Date("2026-03-02"), productId: "prod-b" }), product: productB, tags: [] },
    ];

    const result = getTopProducts(transactions, null, 8);

    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("prod-b");
  });

  it("uses 'Unknown product' for null product", () => {
    const transactions: EnrichedTransaction[] = [
      { transaction: makeTx({ id: "t1", price: "100.00", type: "expense", date: new Date("2026-03-01"), productId: "prod-x" }), product: null, tags: [] },
    ];

    const result = getTopProducts(transactions, null, 8);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Unknown product");
  });

  it("returns empty array when no expense transactions exist", () => {
    const result = getTopProducts([], null, 8);
    expect(result).toEqual([]);
  });
});
