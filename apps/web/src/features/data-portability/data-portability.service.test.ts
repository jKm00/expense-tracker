import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsChartPreferences,
  analyticsExcludedProducts,
  analyticsExcludedTags,
  productAliases,
  products,
  productTags,
  receiptItemMappings,
  recurring,
  tags,
} from "@/lib/db/schema";
import type { DataPortabilityExport } from "./data-portability.dtos";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  query: {
    products: { findMany: vi.fn() },
    transactions: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/features/logger/logger.context", () => ({
  getLogger: () => ({ addAttrs: vi.fn() }),
}));
vi.mock("./data-portability.config", () => ({
  isDataImportEnabled: vi.fn(() => true),
}));

import { dataPortabilityService } from "./data-portability.service";
import { isDataImportEnabled } from "./data-portability.config";

const mockedImportGate = vi.mocked(isDataImportEnabled);

const now = "2026-01-01T00:00:00.000Z";

const tagId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const transactionId = "33333333-3333-4333-8333-333333333333";
const entryId = "44444444-4444-4444-8444-444444444444";
const aliasId = "55555555-5555-4555-8555-555555555555";
const recurringId = "66666666-6666-4666-8666-666666666666";
const mappingId = "77777777-7777-4777-8777-777777777777";

type TagRecord = DataPortabilityExport["data"]["tags"][number];
type ProductRecord = DataPortabilityExport["data"]["products"][number];
type AliasRecord = DataPortabilityExport["data"]["productAliases"][number];
type TransactionRecord = DataPortabilityExport["data"]["transactions"][number];
type EntryRecord = DataPortabilityExport["data"]["entries"][number];
type RecurringRecord = DataPortabilityExport["data"]["recurring"][number];
type MappingRecord = DataPortabilityExport["data"]["receiptItemMappings"][number];

function makeTagRecord(overrides: Partial<TagRecord> = {}): TagRecord {
  return { id: tagId, name: "Groceries", color: null, createdAt: now, updatedAt: now, ...overrides };
}

function makeProductRecord(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: productId,
    name: "Milk",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeAliasRecord(overrides: Partial<AliasRecord> = {}): AliasRecord {
  return {
    id: aliasId,
    productId,
    name: "Melk",
    normalizedName: "melk",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTransactionRecord(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: transactionId,
    store: "Store",
    description: null,
    source: "manual",
    needsReview: false,
    totalPrice: "-10.00",
    date: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeEntryRecord(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: entryId,
    transactionId,
    productId,
    price: "10.00",
    quantity: 1,
    type: "expense",
    ...overrides,
  };
}

function makeRecurringRecord(overrides: Partial<RecurringRecord> = {}): RecurringRecord {
  return {
    id: recurringId,
    productId,
    price: "9.99",
    interval: "monthly",
    type: "expense",
    start: now,
    end: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMappingRecord(overrides: Partial<MappingRecord> = {}): MappingRecord {
  return {
    id: mappingId,
    productId,
    itemName: "Milk",
    normalizedItemName: "milk",
    confirmationCount: 1,
    lastConfirmedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
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

const rowsByTable = new Map<unknown, unknown[]>();

function rowsFor(table: unknown) {
  return rowsByTable.get(table) ?? [];
}

function rowsPromise(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  (promise as unknown as Record<string, unknown>).limit = vi.fn(() => Promise.resolve(rows));
  return promise;
}

function mockSelectChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => rowsPromise(rowsFor(chain.from.mock.calls[0]?.[0])));
  chain.limit = vi.fn(() => Promise.resolve(rowsFor(chain.from.mock.calls[0]?.[0])));
  return chain;
}

function mockInsertChain() {
  return {
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => Promise.resolve([])),
      onConflictDoUpdate: vi.fn(() => Promise.resolve([])),
    })),
  };
}

function mockDeleteChain() {
  return {
    where: vi.fn(() => Promise.resolve([])),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rowsByTable.clear();
  mockedImportGate.mockReturnValue(true);
  mockDb.select.mockImplementation(() => mockSelectChain());
  mockDb.insert.mockImplementation(() => mockInsertChain());
  mockDb.delete.mockImplementation(() => mockDeleteChain());
  mockDb.transaction.mockImplementation(
    async (fn: (tx: unknown) => unknown) => fn(mockDb),
  );
  mockDb.query.products.findMany.mockResolvedValue([]);
  mockDb.query.transactions.findMany.mockResolvedValue([]);
});

describe("dataPortabilityService", () => {
  describe("import gate", () => {
    it("rejects previewImport when import is disabled without touching the database", async () => {
      mockedImportGate.mockReturnValue(false);

      const [error, summary] = await dataPortabilityService.previewImport("user-1", makePayload());

      expect(summary).toBeNull();
      expect(error?.reason).toBe("DATA_IMPORT_DISABLED");
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("rejects applyImport when import is disabled without touching the database", async () => {
      mockedImportGate.mockReturnValue(false);

      const [error, summary] = await dataPortabilityService.applyImport("user-1", makePayload());

      expect(summary).toBeNull();
      expect(error?.reason).toBe("DATA_IMPORT_DISABLED");
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("still exports when import is disabled", async () => {
      mockedImportGate.mockReturnValue(false);

      const [error, payload] = await dataPortabilityService.exportData("user-1", { type: "all" });

      expect(error).toBeNull();
      expect(payload?.format).toBe("expense-tracker-export");
      expect(payload?.data.products).toEqual([]);
    });
  });

  describe("exportData", () => {
    it("returns ok with an empty payload for a user without data", async () => {
      const [error, payload] = await dataPortabilityService.exportData("user-1", { type: "all" });

      expect(error).toBeNull();
      expect(payload?.counts).toEqual({
        tags: 0,
        products: 0,
        productAliases: 0,
        productTags: 0,
        transactions: 0,
        entries: 0,
        entryTags: 0,
        recurring: 0,
        receiptItemMappings: 0,
      });
    });

    it("exports transactions, entries, products, tags, recurring and analytics", async () => {
      const dbTag = {
        id: tagId,
        userId: "user-1",
        name: "Groceries",
        color: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      const dbProduct = {
        id: productId,
        userId: "user-1",
        name: "Milk",
        deletedAt: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      const dbRecurring = {
        id: recurringId,
        productId,
        price: "9.99",
        interval: "monthly",
        type: "expense",
        start: new Date(now),
        end: null,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };

      mockDb.query.transactions.findMany.mockResolvedValue([
        {
          id: transactionId,
          userId: "user-1",
          store: "Store",
          description: null,
          source: "manual",
          needsReview: false,
          totalPrice: "-10.00",
          date: new Date(now),
          createdAt: new Date(now),
          updatedAt: new Date(now),
          entries: [
            {
              id: entryId,
              transactionId,
              productId,
              price: "10.00",
              quantity: 1,
              type: "expense",
              createdAt: new Date(now),
              updatedAt: new Date(now),
              products: { ...dbProduct, tags: [dbTag] },
              tags: [dbTag],
            },
          ],
        },
      ]);
      rowsByTable.set(products, [dbProduct]);
      rowsByTable.set(tags, [dbTag]);
      rowsByTable.set(productTags, [
        { product_tags: { productId, tagId }, products: dbProduct, tags: dbTag },
      ]);
      rowsByTable.set(productAliases, [
        {
          id: aliasId,
          productId,
          name: "Melk",
          normalizedName: "melk",
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);
      rowsByTable.set(recurring, [{ recurring: dbRecurring, products: dbProduct }]);
      rowsByTable.set(receiptItemMappings, [
        {
          id: mappingId,
          userId: "user-1",
          productId,
          itemName: "Milk",
          normalizedItemName: "milk",
          confirmationCount: 1,
          lastConfirmedAt: new Date(now),
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);
      rowsByTable.set(analyticsChartPreferences, [
        {
          userId: "user-1",
          hideUntagged: true,
          hideUnknownProduct: false,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);
      rowsByTable.set(analyticsExcludedTags, [
        { userId: "user-1", tagId, createdAt: new Date(now) },
      ]);
      rowsByTable.set(analyticsExcludedProducts, [
        { userId: "user-1", productId, createdAt: new Date(now) },
      ]);

      const [error, payload] = await dataPortabilityService.exportData("user-1", { type: "all" });

      expect(error).toBeNull();
      expect(payload?.data.transactions).toHaveLength(1);
      expect(payload?.data.transactions[0]).toEqual(
        expect.objectContaining({ id: transactionId, totalPrice: "-10.00" }),
      );
      expect(payload?.data.entries).toEqual([
        expect.objectContaining({ id: entryId, productId, price: "10.00" }),
      ]);
      expect(payload?.data.products).toEqual([
        expect.objectContaining({ id: productId, name: "Milk" }),
      ]);
      expect(payload?.data.tags).toEqual([
        expect.objectContaining({ id: tagId, name: "Groceries" }),
      ]);
      expect(payload?.data.productTags).toEqual([{ productId, tagId }]);
      expect(payload?.data.entryTags).toEqual([{ entryId, tagId }]);
      expect(payload?.data.productAliases).toEqual([
        expect.objectContaining({ id: aliasId, productId, name: "Melk" }),
      ]);
      expect(payload?.data.recurring).toEqual([
        expect.objectContaining({ id: recurringId, productId, price: "9.99" }),
      ]);
      expect(payload?.data.receiptItemMappings).toEqual([
        expect.objectContaining({ id: mappingId, productId, normalizedItemName: "milk" }),
      ]);
      expect(payload?.data.analytics.chartPreferences?.hideUntagged).toBe(true);
      expect(payload?.data.analytics.excludedTagIds).toEqual([tagId]);
      expect(payload?.data.analytics.excludedProductIds).toEqual([productId]);
      expect(payload?.counts.transactions).toBe(1);
      expect(payload?.counts.entries).toBe(1);
    });
  });

  describe("previewImport validation", () => {
    it("rejects import payloads larger than 10 MB before reading the database", async () => {
      const payload = makePayload({
        tags: [makeTagRecord({ name: "x".repeat(10 * 1024 * 1024) })],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(summary).toBeNull();
      expect(error?.reason).toBe("DATA_IMPORT_TOO_LARGE");
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("reports transaction total mismatches during preview", async () => {
      const payload = makePayload({
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord({ totalPrice: "-99.00" })],
        entries: [makeEntryRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "transaction", id: transactionId }),
      ]);
    });

    it("reports duplicate ids within the same collection", async () => {
      const payload = makePayload({
        tags: [makeTagRecord(), makeTagRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "tag", id: tagId, reason: "Duplicate ID in import file" }),
      ]);
    });

    it("reports entries referencing missing transactions or products", async () => {
      const payload = makePayload({
        entries: [makeEntryRecord({ transactionId: "00000000-0000-4000-8000-000000000001" })],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "entry", id: entryId }),
      ]);
    });

    it("reports product tag links referencing missing product or tag", async () => {
      const payload = makePayload({
        productTags: [
          { productId: "00000000-0000-4000-8000-000000000002", tagId: tagId },
        ],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "productTag", id: expect.stringContaining(":") }),
      ]);
    });

    it("reports recurring and receipt mappings referencing a missing product", async () => {
      const payload = makePayload({
        recurring: [makeRecurringRecord()],
        receiptItemMappings: [makeMappingRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "productReference", id: recurringId }),
        expect.objectContaining({ type: "productReference", id: mappingId }),
      ]);
    });
  });

  describe("previewImport planning", () => {
    it("preserves ids and plans creates for fresh records", async () => {
      const payload = makePayload({
        tags: [makeTagRecord()],
        products: [makeProductRecord()],
        productAliases: [makeAliasRecord()],
        transactions: [makeTransactionRecord()],
        entries: [makeEntryRecord()],
        entryTags: [{ entryId, tagId }],
        recurring: [makeRecurringRecord()],
        receiptItemMappings: [makeMappingRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([]);
      expect(summary?.conflicts).toEqual([]);
      expect(summary?.creates).toEqual({
        tags: 1,
        products: 1,
        productAliases: 1,
        transactions: 1,
        entries: 1,
        entryTags: 1,
        recurring: 1,
        receiptItemMappings: 1,
      });
    });

    it("remaps tags and products to existing records by natural key", async () => {
      const existingTagId = "00000000-0000-4000-8000-00000000000a";
      const existingProductId = "00000000-0000-4000-8000-00000000000b";
      rowsByTable.set(tags, [
        {
          id: existingTagId,
          userId: "user-1",
          name: "Groceries",
          color: null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);
      mockDb.query.products.findMany.mockResolvedValue([
        {
          id: existingProductId,
          userId: "user-1",
          name: "Milk",
          deletedAt: null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
          aliases: [],
        },
      ]);

      const payload = makePayload({
        tags: [makeTagRecord()],
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord()],
        entries: [makeEntryRecord()],
        entryTags: [{ entryId, tagId }],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([]);
      expect(summary?.conflicts).toEqual([]);
      expect(summary?.creates).toEqual({
        transactions: 1,
        entries: 1,
        entryTags: 1,
      });
      expect(summary?.skips).toEqual({
        tags: 1,
        products: 1,
      });
    });

    it("reports conflicts when existing records differ and keeps the existing value", async () => {
      rowsByTable.set(tags, [
        {
          id: tagId,
          userId: "user-1",
          name: "Other name",
          color: null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);
      rowsByTable.set(products, [
        {
          id: productId,
          userId: "user-1",
          name: "Other product",
          deletedAt: null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);

      const payload = makePayload({
        tags: [makeTagRecord()],
        products: [makeProductRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.creates).toEqual({});
      expect(summary?.conflicts).toEqual([
        expect.objectContaining({ type: "tag", id: tagId }),
        expect.objectContaining({ type: "product", id: productId }),
      ]);
    });

    it("keeps deletions for existing soft-deleted products and skips dependants", async () => {
      rowsByTable.set(products, [
        {
          id: productId,
          userId: "user-1",
          name: "Milk",
          deletedAt: new Date("2025-01-01T00:00:00.000Z"),
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);

      const payload = makePayload({
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord()],
        entries: [makeEntryRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.creates).toEqual({});
      expect(summary?.conflicts).toEqual([
        expect.objectContaining({ type: "product", id: productId }),
        expect.objectContaining({ type: "transaction", id: transactionId }),
      ]);
    });

    it("skips recurring rules that naturally match an existing active rule", async () => {
      mockDb.query.products.findMany.mockResolvedValue([]);
      rowsByTable.set(recurring, [
        {
          recurring: {
            id: "00000000-0000-4000-8000-00000000000c",
            productId,
            price: "9.99",
            interval: "monthly",
            type: "expense",
            start: new Date(now),
            end: null,
            isActive: true,
            deletedAt: null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
          products: {
            id: productId,
            userId: "user-1",
            name: "Milk",
            deletedAt: null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        },
      ]);

      const payload = makePayload({
        products: [makeProductRecord()],
        recurring: [makeRecurringRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([]);
      expect(summary?.skips.recurring).toBe(1);
      expect(summary?.creates.recurring).toBeUndefined();
    });

    it("reports conflicts when an existing receipt mapping points to another product", async () => {
      rowsByTable.set(receiptItemMappings, [
        {
          id: "00000000-0000-4000-8000-00000000000d",
          userId: "user-1",
          productId: "00000000-0000-4000-8000-00000000000e",
          itemName: "Milk",
          normalizedItemName: "milk",
          confirmationCount: 1,
          lastConfirmedAt: new Date(now),
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      ]);

      const payload = makePayload({
        products: [makeProductRecord()],
        receiptItemMappings: [makeMappingRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.skips.receiptItemMappings).toBe(1);
      expect(summary?.conflicts).toEqual([
        expect.objectContaining({ type: "receiptMapping", id: mappingId }),
      ]);
    });

    it("reports a conflict when an existing recurring rule is deleted", async () => {
      rowsByTable.set(recurring, [
        {
          recurring: {
            id: recurringId,
            productId,
            price: "9.99",
            interval: "monthly",
            type: "expense",
            start: new Date(now),
            end: null,
            isActive: true,
            deletedAt: new Date("2025-01-01T00:00:00.000Z"),
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
          products: {
            id: productId,
            userId: "user-1",
            name: "Milk",
            deletedAt: null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        },
      ]);

      const payload = makePayload({
        products: [makeProductRecord()],
        recurring: [makeRecurringRecord()],
      });

      const [error, summary] = await dataPortabilityService.previewImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.skips.recurring).toBe(1);
      expect(summary?.conflicts).toEqual([
        expect.objectContaining({ type: "recurring", id: recurringId }),
      ]);
    });
  });

  describe("applyImport", () => {
    it("applies a valid import inside a transaction and returns the summary", async () => {
      const payload = makePayload({
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord()],
        entries: [makeEntryRecord()],
      });

      const [error, summary] = await dataPortabilityService.applyImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.creates).toEqual({
        products: 1,
        transactions: 1,
        entries: 1,
      });
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });

    it("applies an empty import without writing anything", async () => {
      const [error, summary] = await dataPortabilityService.applyImport("user-1", makePayload());

      expect(error).toBeNull();
      expect(summary?.creates).toEqual({});
      expect(summary?.errors).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("returns the summary without writing when validation errors exist", async () => {
      const payload = makePayload({
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord({ totalPrice: "-99.00" })],
        entries: [makeEntryRecord()],
      });

      const [error, summary] = await dataPortabilityService.applyImport("user-1", payload);

      expect(error).toBeNull();
      expect(summary?.errors).toEqual([
        expect.objectContaining({ type: "transaction", id: transactionId }),
      ]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("returns DATA_IMPORT_APPLY_ERROR when the transaction fails", async () => {
      mockDb.transaction.mockRejectedValue(new Error("DB down"));

      const payload = makePayload({
        products: [makeProductRecord()],
        transactions: [makeTransactionRecord()],
        entries: [makeEntryRecord()],
      });

      const [error, summary] = await dataPortabilityService.applyImport("user-1", payload);

      expect(summary).toBeNull();
      expect(error?.reason).toBe("DATA_IMPORT_APPLY_ERROR");
    });

    it("returns DATA_IMPORT_PREVIEW_ERROR when preview planning throws", async () => {
      mockDb.query.products.findMany.mockRejectedValue(new Error("DB down"));

      const [error, summary] = await dataPortabilityService.previewImport("user-1", makePayload());

      expect(summary).toBeNull();
      expect(error?.reason).toBe("DATA_IMPORT_PREVIEW_ERROR");
    });
  });
});
