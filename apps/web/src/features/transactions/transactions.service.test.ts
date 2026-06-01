import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  makeProduct,
  makeTransaction,
  makeEntry,
  makeTag,
} from "../__test-fixtures__";

vi.mock("./transactions.repo", () => ({
  transactionRepo: {
    getAll: vi.fn(),
    getKpis: vi.fn(),
    getOne: vi.fn(),
    save: vi.fn(),
    saveEntry: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    updateEntry: vi.fn(),
    removeEntry: vi.fn(),
    saveEntryTagLink: vi.fn(),
    removeEntryTagLink: vi.fn(),
    removeAllEntryTagLinks: vi.fn(),
  },
}));

vi.mock("../products/products.service", () => ({
  productService: {
    addProduct: vi.fn(),
    getProduct: vi.fn(),
  },
}));

vi.mock("../tags/tags.service", () => ({
  tagsService: {
    getTag: vi.fn(),
  },
}));

import { transactionService } from "./transactions.service";
import { transactionRepo } from "./transactions.repo";
import { productService } from "../products/products.service";
import { tagsService } from "../tags/tags.service";

const mockTransactionRepo = vi.mocked(transactionRepo);
const mockProductService = vi.mocked(productService);
const mockTagsService = vi.mocked(tagsService);

beforeEach(() => {
  vi.resetAllMocks();
  mockTagsService.getTag.mockResolvedValue([null, makeTag()] as any);
  mockTransactionRepo.removeAllEntryTagLinks.mockResolvedValue([] as any);
  mockTransactionRepo.saveEntryTagLink.mockResolvedValue([{}] as any);
});

// Helper to build a full transaction with entries for getTransaction mock
function makeFullTransaction(overrides: Record<string, unknown> = {}) {
  const entry = makeEntry();
  return makeTransaction({
    entries: [{ ...entry, products: makeProduct() }],
    ...overrides,
  });
}

describe("transactionService", () => {
  describe("getTransactions", () => {
    it("returns ok with transactions array on success", async () => {
      const txs = [makeTransaction(), makeTransaction({ id: "tx-2" })];
      mockTransactionRepo.getAll.mockResolvedValue(txs as any);

      const [error, data] = await transactionService.getTransactions("user-1");

      expect(error).toBeNull();
      expect(data).toEqual(txs);
    });

    it("uses current month date range when year/month not provided", async () => {
      mockTransactionRepo.getAll.mockResolvedValue([]);

      await transactionService.getTransactions("user-1");

      expect(mockTransactionRepo.getAll).toHaveBeenCalledOnce();
      const [, start, end] = mockTransactionRepo.getAll.mock.calls[0];
      // Start should be the first of the current month
      expect(start.getDate()).toBe(1);
      // End should be approximately 1 month later
      expect(end > start).toBe(true);
    });

    it("uses specified year and month when both provided", async () => {
      mockTransactionRepo.getAll.mockResolvedValue([]);

      await transactionService.getTransactions("user-1", 2024, 0); // Jan 2024

      const [, start] = mockTransactionRepo.getAll.mock.calls[0];
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
    });

    it("returns ok with empty array when no transactions exist", async () => {
      mockTransactionRepo.getAll.mockResolvedValue([]);

      const [error, data] = await transactionService.getTransactions("user-1");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("returns err with TRANSACTION_DB_ERROR when repo throws", async () => {
      mockTransactionRepo.getAll.mockRejectedValue(new Error("DB error"));

      const [error, data] = await transactionService.getTransactions("user-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("TRANSACTION_DB_ERROR");
    });
  });

  describe("getTransactionKpis", () => {
    it("returns computed kpis from repo aggregates", async () => {
      mockTransactionRepo.getKpis.mockResolvedValue({
        transactionCount: 10,
        totalEntries: 25,
      } as any);

      const [error, data] = await transactionService.getTransactionKpis("user-1", {
        year: 2024,
        month: 0,
      });

      expect(error).toBeNull();
      expect(data).toEqual({
        count: 10,
        averagePerDay: 0.32,
        averageItemsPerTransaction: 2.5,
      });
    });

    it("returns TRANSACTION_DB_ERROR when repo throws", async () => {
      mockTransactionRepo.getKpis.mockRejectedValue(new Error("DB error"));

      const [error, data] = await transactionService.getTransactionKpis("user-1", {});

      expect(data).toBeNull();
      expect(error?.reason).toBe("TRANSACTION_DB_ERROR");
    });
  });

  describe("getTransaction", () => {
    it("returns ok with transaction and mapped entries on success", async () => {
      const entry = makeEntry();
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error, data] = await transactionService.getTransaction("user-1", "tx-1");

      expect(error).toBeNull();
      // entries should be mapped with `product` key
      expect(data?.entries[0]).toHaveProperty("product");
    });

    it("returns err with TRANSACTION_NOT_FOUND when repo returns null", async () => {
      mockTransactionRepo.getOne.mockResolvedValue(undefined);

      const [error, data] = await transactionService.getTransaction("user-1", "tx-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("TRANSACTION_NOT_FOUND");
    });

    it("returns err with TRANSACTION_UNAUTHORIZED when userId doesn't match", async () => {
      const tx = makeTransaction({ userId: "other-user" });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error, data] = await transactionService.getTransaction("user-1", "tx-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("TRANSACTION_UNAUTHORIZED");
    });

    it("returns err with UNEXPECTED_DB_ERROR when repo throws", async () => {
      mockTransactionRepo.getOne.mockRejectedValue(new Error("DB error"));

      const [error, data] = await transactionService.getTransaction("user-1", "tx-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("saveTransaction", () => {
    const baseEntry = {
      product: { id: "product-1", name: "Milk" },
      quantity: "2",
      price: "5",
      type: "expense" as const,
    };

    it("returns ok with saved transaction when all entries save successfully", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

      const [error, data] = await transactionService.saveTransaction({
        transaction: {
          userId: "user-1",
          store: "Shop",
          source: "manual",
          date: new Date(),
        },
        entries: [baseEntry],
      });

      expect(error).toBeNull();
      expect(data).toEqual(tx);
    });

    it("calculates totalPrice correctly for expense entries", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

        await transactionService.saveTransaction({
          transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
          entries: [{ product: { id: "p1", name: "Milk" }, quantity: "2", price: "5", type: "expense" }],
        });

      // totalPrice = 0 - 5*2 = -10
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalPrice: "-10" }),
      );
    });

    it("calculates totalPrice correctly for income entries", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

        await transactionService.saveTransaction({
          transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
          entries: [{ product: { id: "p1", name: "Salary" }, quantity: "1", price: "1000", type: "income" }],
        });

      // totalPrice = 0 + 1000*1 = 1000
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalPrice: "1000" }),
      );
    });

    it("calculates totalPrice correctly for mixed expense and income entries", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

        await transactionService.saveTransaction({
          transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
          entries: [
          { product: { id: "p1", name: "Income" }, quantity: "1", price: "100", type: "income" },
          { product: { id: "p2", name: "Expense" }, quantity: "2", price: "20", type: "expense" },
          ],
        });

      // totalPrice = 100 - 40 = 60
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalPrice: "60" }),
      );
    });

    it("creates new product via addProduct when entry product.id is null", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.addProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

        await transactionService.saveTransaction({
          transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
          entries: [{ product: { id: null, name: "New Product" }, quantity: "1", price: "10", type: "expense" }],
        });

      expect(mockProductService.addProduct).toHaveBeenCalledWith({
        userId: "user-1",
        name: "New Product",
      });
    });

    it("fetches existing product via getProduct when entry product.id is set", async () => {
      const tx = makeTransaction();
      const product = makeProduct();
      mockTransactionRepo.save.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([makeEntry()] as any);

        await transactionService.saveTransaction({
          transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
          entries: [{ product: { id: "product-1", name: "Milk" }, quantity: "1", price: "10", type: "expense" }],
        });

      expect(mockProductService.getProduct).toHaveBeenCalledWith("user-1", "product-1");
    });

    it("returns err with SAVE_TRANSACTION_ERROR when repo save throws", async () => {
      mockTransactionRepo.save.mockRejectedValue(new Error("DB error"));

      const [error] = await transactionService.saveTransaction({
        transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
        entries: [baseEntry],
      });

      expect(error?.reason).toBe("SAVE_TRANSACTION_ERROR");
    });

    it("returns err with SAVE_TRANSACTION_NO_RETURNING when repo save returns empty array", async () => {
      mockTransactionRepo.save.mockResolvedValue([]);

      const [error] = await transactionService.saveTransaction({
        transaction: { userId: "user-1", store: "Shop", source: "manual", date: new Date() },
        entries: [baseEntry],
      });

      expect(error?.reason).toBe("SAVE_TRANSACTION_NO_RETURNING");
    });
  });

  describe("deleteTransaction", () => {
    it("returns ok with removed transactions array on success", async () => {
      const tx = makeFullTransaction();
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.remove.mockResolvedValue([tx] as any);

      const [error, data] = await transactionService.deleteTransaction("user-1", "tx-1");

      expect(error).toBeNull();
      expect(data).toEqual([tx]);
    });

    it("returns err early when getTransaction fails", async () => {
      mockTransactionRepo.getOne.mockResolvedValue(undefined);

      const [error] = await transactionService.deleteTransaction("user-1", "tx-1");

      expect(error?.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockTransactionRepo.remove).not.toHaveBeenCalled();
    });

    it("returns err with TRANSACTION_NOT_RETURNED when remove returns empty array", async () => {
      const tx = makeFullTransaction();
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.remove.mockResolvedValue([]);

      const [error] = await transactionService.deleteTransaction("user-1", "tx-1");

      expect(error?.reason).toBe("TRANSACTION_NOT_RETURNED");
    });

    it("returns err with TRANSACTION_DB_ERROR when remove throws", async () => {
      const tx = makeFullTransaction();
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.remove.mockRejectedValue(new Error("DB error"));

      const [error] = await transactionService.deleteTransaction("user-1", "tx-1");

      expect(error?.reason).toBe("TRANSACTION_DB_ERROR");
    });
  });

  describe("updateTransaction", () => {
    const baseUpdateEntry = {
      id: "entry-1",
      product: { id: "product-1", name: "Milk" },
      quantity: "1",
      price: "10",
      type: "expense" as const,
    };

    function setupSuccessfulUpdate() {
      const entry = makeEntry({ id: "entry-1" });
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      const product = makeProduct();

      // First call: getTransaction for ownership check
      // Second call: getTransaction for re-fetch
      mockTransactionRepo.getOne.mockResolvedValueOnce(tx as any).mockResolvedValueOnce(tx as any);
      mockTransactionRepo.update.mockResolvedValue([tx] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.updateEntry.mockResolvedValue([entry] as any);

      return { tx, product };
    }

    it("returns ok with re-fetched updated transaction on success", async () => {
      setupSuccessfulUpdate();

      const [error, data] = await transactionService.updateTransaction(
        "user-1",
        "tx-1",
        {
          transaction: { store: "Updated Shop" },
          entries: [baseUpdateEntry],
        },
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        "tx-1",
        expect.objectContaining({ needsReview: false }),
      );
    });

    it("returns err early when getTransaction fails", async () => {
      mockTransactionRepo.getOne.mockResolvedValue(undefined);

      const [error] = await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [baseUpdateEntry],
      });

      expect(error?.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockTransactionRepo.update).not.toHaveBeenCalled();
    });

    it("returns err with INVALID_ENTRY_IDS when entry ID doesn't belong to transaction", async () => {
      const entry = makeEntry({ id: "entry-1" });
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error] = await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [{ ...baseUpdateEntry, id: "foreign-entry-id" }],
      });

      expect(error?.reason).toBe("INVALID_ENTRY_IDS");
    });

    it("deletes entries absent from update payload", async () => {
      const entry1 = makeEntry({ id: "entry-1" });
      const entry2 = makeEntry({ id: "entry-2" });
      const tx = makeTransaction({
        entries: [
          { ...entry1, products: makeProduct() },
          { ...entry2, products: makeProduct() },
        ],
      });
      const product = makeProduct();

      mockTransactionRepo.getOne
        .mockResolvedValueOnce(tx as any)
        .mockResolvedValueOnce(tx as any);
      mockTransactionRepo.update.mockResolvedValue([tx] as any);
      mockTransactionRepo.removeEntry.mockResolvedValue([entry2] as any);
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.updateEntry.mockResolvedValue([entry1] as any);

      await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        // only include entry-1, so entry-2 should be deleted
        entries: [{ ...baseUpdateEntry, id: "entry-1" }],
      });

      expect(mockTransactionRepo.removeEntry).toHaveBeenCalledWith("entry-2");
    });

    it("does not call removeEntry for entries still in update payload", async () => {
      setupSuccessfulUpdate();

      await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [baseUpdateEntry], // entry-1 is in payload
      });

      expect(mockTransactionRepo.removeEntry).not.toHaveBeenCalled();
    });

    it("calls saveEntry for new entries without id", async () => {
      const entry = makeEntry({ id: "entry-1" });
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      const product = makeProduct();

      mockTransactionRepo.getOne
        .mockResolvedValueOnce(tx as any)
        .mockResolvedValueOnce(tx as any);
      mockTransactionRepo.update.mockResolvedValue([tx] as any);
      mockTransactionRepo.removeEntry.mockResolvedValue([entry] as any);
      mockProductService.addProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.saveEntry.mockResolvedValue([entry] as any);

      // existing entry-1 not in payload (gets deleted), new entry without id
        await transactionService.updateTransaction("user-1", "tx-1", {
          transaction: {},
          entries: [
          { product: { id: null, name: "New Item" }, quantity: "1", price: "5", type: "expense" },
          ],
        });

      expect(mockTransactionRepo.saveEntry).toHaveBeenCalled();
      expect(mockProductService.addProduct).toHaveBeenCalled();
    });

    it("calls updateEntry for entries with existing id", async () => {
      setupSuccessfulUpdate();

      await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [baseUpdateEntry], // has id: "entry-1"
      });

      expect(mockTransactionRepo.updateEntry).toHaveBeenCalled();
    });

    it("returns err with UPDATE_TRANSACTION_NO_RETURNING when repo update returns empty array", async () => {
      const entry = makeEntry({ id: "entry-1" });
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.update.mockResolvedValue([]);

      const [error] = await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [baseUpdateEntry],
      });

      expect(error?.reason).toBe("UPDATE_TRANSACTION_NO_RETURNING");
    });

    it("returns err with UPDATE_TRANSACTION_ERROR when repo update throws", async () => {
      const entry = makeEntry({ id: "entry-1" });
      const tx = makeTransaction({
        entries: [{ ...entry, products: makeProduct() }],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.update.mockRejectedValue(new Error("DB error"));

      const [error] = await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [baseUpdateEntry],
      });

      expect(error?.reason).toBe("UPDATE_TRANSACTION_ERROR");
    });

    it("returns err when removeEntry throws", async () => {
      const entry1 = makeEntry({ id: "entry-1" });
      const entry2 = makeEntry({ id: "entry-2" });
      const tx = makeTransaction({
        entries: [
          { ...entry1, products: makeProduct() },
          { ...entry2, products: makeProduct() },
        ],
      });
      const product = makeProduct();

      mockTransactionRepo.getOne
        .mockResolvedValueOnce(tx as any)
        .mockResolvedValueOnce(tx as any);
      mockTransactionRepo.update.mockResolvedValue([tx] as any);
      mockTransactionRepo.removeEntry.mockRejectedValue(new Error("Delete failed"));
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockTransactionRepo.updateEntry.mockResolvedValue([entry1] as any);

      const [error] = await transactionService.updateTransaction("user-1", "tx-1", {
        transaction: {},
        entries: [{ ...baseUpdateEntry, id: "entry-1" }],
      });

      expect(error?.reason).toBe("REMOVE_ENTRY_ERROR");
    });
  });

  describe("linkTagToEntry", () => {
    it("returns err with INVALID_ENTRY_IDS when entry does not belong to transaction", async () => {
      const tx = makeFullTransaction({
        id: "tx-1",
        userId: "user-1",
        entries: [makeEntry({ id: "entry-1", tags: [], products: makeProduct() })],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error] = await transactionService.linkTagToEntry(
        "user-1",
        "tx-1",
        "entry-2",
        "tag-1",
      );

      expect(error?.reason).toBe("INVALID_ENTRY_IDS");
      expect(mockTagsService.getTag).not.toHaveBeenCalled();
      expect(mockTransactionRepo.saveEntryTagLink).not.toHaveBeenCalled();
    });

    it("returns tag ownership error when tag does not belong to user", async () => {
      const tx = makeFullTransaction({
        id: "tx-1",
        userId: "user-1",
        entries: [makeEntry({ id: "entry-1", tags: [], products: makeProduct() })],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTagsService.getTag.mockResolvedValueOnce([
        {
          reason: "TAG_UNATHORIZED",
          message: "Tag does not belong to this user",
        },
        null,
      ] as any);

      const [error] = await transactionService.linkTagToEntry(
        "user-1",
        "tx-1",
        "entry-1",
        "tag-1",
      );

      expect(error?.reason).toBe("TAG_UNATHORIZED");
      expect(mockTransactionRepo.saveEntryTagLink).not.toHaveBeenCalled();
    });

    it("returns ok without writing when link already exists", async () => {
      const existingTag = makeTag({ id: "tag-1" });
      const tx = makeFullTransaction({
        id: "tx-1",
        userId: "user-1",
        entries: [
          makeEntry({
            id: "entry-1",
            tags: [existingTag],
            products: makeProduct(),
          }),
        ],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error, data] = await transactionService.linkTagToEntry(
        "user-1",
        "tx-1",
        "entry-1",
        "tag-1",
      );

      expect(error).toBeNull();
      expect(data?.message).toContain("already linked");
      expect(mockTransactionRepo.saveEntryTagLink).not.toHaveBeenCalled();
    });
  });

  describe("unlinkTagFromEntry", () => {
    it("returns err with INVALID_ENTRY_IDS when entry does not belong to transaction", async () => {
      const tx = makeFullTransaction({
        id: "tx-1",
        userId: "user-1",
        entries: [makeEntry({ id: "entry-1", tags: [], products: makeProduct() })],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);

      const [error] = await transactionService.unlinkTagFromEntry(
        "user-1",
        "tx-1",
        "entry-2",
        "tag-1",
      );

      expect(error?.reason).toBe("INVALID_ENTRY_IDS");
      expect(mockTransactionRepo.removeEntryTagLink).not.toHaveBeenCalled();
    });

    it("returns err with TAG_ENTRY_LINK_NOT_FOUND when unlink target does not exist", async () => {
      const tx = makeFullTransaction({
        id: "tx-1",
        userId: "user-1",
        entries: [makeEntry({ id: "entry-1", tags: [], products: makeProduct() })],
      });
      mockTransactionRepo.getOne.mockResolvedValue(tx as any);
      mockTransactionRepo.removeEntryTagLink.mockResolvedValueOnce([] as any);

      const [error] = await transactionService.unlinkTagFromEntry(
        "user-1",
        "tx-1",
        "entry-1",
        "tag-1",
      );

      expect(error?.reason).toBe("TAG_ENTRY_LINK_NOT_FOUND");
    });
  });
});
