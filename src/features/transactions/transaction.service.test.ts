import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the repo module BEFORE importing service
vi.mock("./transaction.repo", () => ({
  transactionRepo: {
    getAll: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock productService to avoid DB dependencies
vi.mock("../products/product.service", () => ({
  productService: {
    getByName: vi.fn(),
    create: vi.fn(),
  },
}));

import { transactionService } from "./transaction.service";
import { transactionRepo } from "./transaction.repo";

const mockRepo = vi.mocked(transactionRepo);

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(data).toBeNull();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(data).toBeNull();
    });

    it("returns transaction when user owns it", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };
      mockRepo.get.mockResolvedValue(mockTransaction);

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(mockTransaction);
    });
  });

  describe("updateTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("updates and returns transaction when user owns it", async () => {
      const existing = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };
      const updated = { ...existing, price: "20.00" };

      mockRepo.get.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(updated);

      const [err, data] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).toBeNull();
      expect(data).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith("txn-1", {
        price: "20.00",
      });
    });
  });

  describe("deleteTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it("deletes and returns transaction when user owns it", async () => {
      const existing = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };

      mockRepo.get.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(existing);

      const [err, data] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(existing);
      expect(mockRepo.remove).toHaveBeenCalledWith("txn-1");
    });
  });
});
