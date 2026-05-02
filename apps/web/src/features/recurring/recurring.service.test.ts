import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProduct, makeRecurring } from "../__test-fixtures__";

vi.mock("./recurring.repo", () => ({
  recurringRepo: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock("../products/products.service", () => ({
  productService: {
    addProduct: vi.fn(),
    getProduct: vi.fn(),
  },
}));

import { recurringService } from "./recurring.service";
import { recurringRepo } from "./recurring.repo";
import { productService } from "../products/products.service";

const mockRecurringRepo = vi.mocked(recurringRepo);
const mockProductService = vi.mocked(productService);

beforeEach(() => {
  vi.clearAllMocks();
});

const baseCreateData = {
  price: "9.99",
  interval: "monthly" as const,
  type: "expense" as const,
  start: new Date("2024-01-01"),
  end: null,
  isActive: true,
  product: { id: null as string | null, name: "Netflix" },
};

describe("recurringService", () => {
  describe("getRecurrings", () => {
    it("returns ok with array of recurring transactions on success", async () => {
      const items = [makeRecurring(), makeRecurring({ id: "rec-2" })];
      mockRecurringRepo.getAll.mockResolvedValue(items as any);

      const [error, data] = await recurringService.getRecurrings("user-1");

      expect(error).toBeNull();
      expect(data).toEqual(items);
    });

    it("returns ok with empty array when user has none", async () => {
      mockRecurringRepo.getAll.mockResolvedValue([]);

      const [error, data] = await recurringService.getRecurrings("user-1");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("returns err with RECURRING_DB_ERROR when repo throws", async () => {
      mockRecurringRepo.getAll.mockRejectedValue(new Error("DB error"));

      const [error, data] = await recurringService.getRecurrings("user-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_DB_ERROR");
    });
  });

  describe("getRecurring", () => {
    it("returns ok with recurring transaction when found and owned", async () => {
      const item = makeRecurring({ products: makeProduct({ userId: "user-1" }) });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(error).toBeNull();
      expect(data).toEqual(item);
    });

    it("returns err with RECURRING_NOT_FOUND when repo returns null", async () => {
      mockRecurringRepo.getOne.mockResolvedValue(undefined);

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_NOT_FOUND");
    });

    it("returns err with RECURRING_NOT_FOUND when deletedAt is set", async () => {
      const item = makeRecurring({
        deletedAt: new Date(),
        products: makeProduct({ userId: "user-1" }),
      });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_NOT_FOUND");
    });

    it("returns err with RECURRING_UNAUTHORIZED when products is null", async () => {
      const item = makeRecurring({ deletedAt: null, products: null });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_UNAUTHORIZED");
    });

    it("returns err with RECURRING_UNAUTHORIZED when products.userId doesn't match", async () => {
      const item = makeRecurring({ products: makeProduct({ userId: "other-user" }) });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_UNAUTHORIZED");
    });

    it("returns err with RECURRING_DB_ERROR when repo throws", async () => {
      mockRecurringRepo.getOne.mockRejectedValue(new Error("DB error"));

      const [error, data] = await recurringService.getRecurring("user-1", "rec-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("RECURRING_DB_ERROR");
    });
  });

  describe("createRecurring", () => {
    it("creates new product and saves when product.id is null", async () => {
      const product = makeProduct();
      const item = makeRecurring();
      mockProductService.addProduct.mockResolvedValue([null, product] as any);
      mockRecurringRepo.save.mockResolvedValue([item] as any);

      const [error, data] = await recurringService.createRecurring("user-1", {
        ...baseCreateData,
        product: { id: null, name: "Netflix" },
      });

      expect(error).toBeNull();
      expect(data).toEqual(item);
      expect(mockProductService.addProduct).toHaveBeenCalledWith({
        userId: "user-1",
        name: "Netflix",
      });
    });

    it("fetches existing product and saves when product.id provided", async () => {
      const product = makeProduct();
      const item = makeRecurring();
      mockProductService.getProduct.mockResolvedValue([null, product] as any);
      mockRecurringRepo.save.mockResolvedValue([item] as any);

      const [error, data] = await recurringService.createRecurring("user-1", {
        ...baseCreateData,
        product: { id: "product-1", name: "Netflix" },
      });

      expect(error).toBeNull();
      expect(data).toEqual(item);
      expect(mockProductService.getProduct).toHaveBeenCalledWith("user-1", "product-1");
    });

    it("returns err propagating productService error when product resolution fails", async () => {
      mockProductService.addProduct.mockResolvedValue([
        { reason: "UNEXPECTED_DB_ERROR", message: "failed" },
        null,
      ] as any);

      const [error] = await recurringService.createRecurring("user-1", baseCreateData);

      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
      expect(mockRecurringRepo.save).not.toHaveBeenCalled();
    });

    it("returns err with RECURRING_NOT_RETURNED when repo save returns empty array", async () => {
      const product = makeProduct();
      mockProductService.addProduct.mockResolvedValue([null, product] as any);
      mockRecurringRepo.save.mockResolvedValue([]);

      const [error] = await recurringService.createRecurring("user-1", baseCreateData);

      expect(error?.reason).toBe("RECURRING_NOT_RETURNED");
    });

    it("returns err with RECURRING_DB_ERROR when repo save throws", async () => {
      const product = makeProduct();
      mockProductService.addProduct.mockResolvedValue([null, product] as any);
      mockRecurringRepo.save.mockRejectedValue(new Error("DB error"));

      const [error] = await recurringService.createRecurring("user-1", baseCreateData);

      expect(error?.reason).toBe("RECURRING_DB_ERROR");
    });
  });

  describe("updateRecurring", () => {
    function setupGetRecurring() {
      const item = makeRecurring({ products: makeProduct({ userId: "user-1" }) });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);
      return item;
    }

    it("returns ok with updated recurring on success (no product change)", async () => {
      setupGetRecurring();
      const updated = makeRecurring({ price: "19.99" });
      mockRecurringRepo.update.mockResolvedValue([updated] as any);

      const [error, data] = await recurringService.updateRecurring("user-1", "rec-1", {
        price: "19.99",
      });

      expect(error).toBeNull();
      expect(data).toEqual(updated);
      expect(mockProductService.getProduct).not.toHaveBeenCalled();
    });

    it("resolves and updates productId when data.product provided", async () => {
      setupGetRecurring();
      const newProduct = makeProduct({ id: "product-2" });
      const updated = makeRecurring({ productId: "product-2" });
      mockProductService.getProduct.mockResolvedValue([null, newProduct] as any);
      mockRecurringRepo.update.mockResolvedValue([updated] as any);

      const [error] = await recurringService.updateRecurring("user-1", "rec-1", {
        product: { id: "product-2", name: "Spotify" },
      });

      expect(error).toBeNull();
      expect(mockRecurringRepo.update).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({ productId: "product-2" }),
      );
    });

    it("returns err early when getRecurring fails", async () => {
      mockRecurringRepo.getOne.mockResolvedValue(undefined);

      const [error] = await recurringService.updateRecurring("user-1", "rec-1", {
        price: "19.99",
      });

      expect(error?.reason).toBe("RECURRING_NOT_FOUND");
      expect(mockRecurringRepo.update).not.toHaveBeenCalled();
    });

    it("returns err propagating product resolution error when updating product", async () => {
      setupGetRecurring();
      mockProductService.getProduct.mockResolvedValue([
        { reason: "PRODUCT_NOT_FOUND", message: "not found" },
        null,
      ] as any);

      const [error] = await recurringService.updateRecurring("user-1", "rec-1", {
        product: { id: "bad-id", name: "Bad" },
      });

      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockRecurringRepo.update).not.toHaveBeenCalled();
    });

    it("returns err with RECURRING_UPDATE_FAILED when repo update returns empty array", async () => {
      setupGetRecurring();
      mockRecurringRepo.update.mockResolvedValue([]);

      const [error] = await recurringService.updateRecurring("user-1", "rec-1", {
        price: "19.99",
      });

      expect(error?.reason).toBe("RECURRING_UPDATE_FAILED");
    });

    it("returns err with RECURRING_DB_ERROR when repo update throws", async () => {
      setupGetRecurring();
      mockRecurringRepo.update.mockRejectedValue(new Error("DB error"));

      const [error] = await recurringService.updateRecurring("user-1", "rec-1", {
        price: "19.99",
      });

      expect(error?.reason).toBe("RECURRING_DB_ERROR");
    });

    it("does not include productId in update payload when data.product absent", async () => {
      setupGetRecurring();
      const updated = makeRecurring();
      mockRecurringRepo.update.mockResolvedValue([updated] as any);

      await recurringService.updateRecurring("user-1", "rec-1", {
        price: "19.99",
      });

      const updateArg = mockRecurringRepo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty("productId");
    });
  });

  describe("deleteRecurring", () => {
    it("returns ok with soft-deleted recurring on success", async () => {
      const item = makeRecurring({ products: makeProduct({ userId: "user-1" }) });
      const deleted = makeRecurring({ deletedAt: new Date() });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);
      mockRecurringRepo.softDelete.mockResolvedValue([deleted] as any);

      const [error, data] = await recurringService.deleteRecurring("user-1", "rec-1");

      expect(error).toBeNull();
      expect(data).toEqual(deleted);
    });

    it("returns err early when getRecurring fails", async () => {
      mockRecurringRepo.getOne.mockResolvedValue(undefined);

      const [error] = await recurringService.deleteRecurring("user-1", "rec-1");

      expect(error?.reason).toBe("RECURRING_NOT_FOUND");
      expect(mockRecurringRepo.softDelete).not.toHaveBeenCalled();
    });

    it("returns err with RECURRING_DELETE_FAILED when softDelete returns empty array", async () => {
      const item = makeRecurring({ products: makeProduct({ userId: "user-1" }) });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);
      mockRecurringRepo.softDelete.mockResolvedValue([]);

      const [error] = await recurringService.deleteRecurring("user-1", "rec-1");

      expect(error?.reason).toBe("RECURRING_DELETE_FAILED");
    });

    it("returns err with RECURRING_DB_ERROR when softDelete throws", async () => {
      const item = makeRecurring({ products: makeProduct({ userId: "user-1" }) });
      mockRecurringRepo.getOne.mockResolvedValue(item as any);
      mockRecurringRepo.softDelete.mockRejectedValue(new Error("DB error"));

      const [error] = await recurringService.deleteRecurring("user-1", "rec-1");

      expect(error?.reason).toBe("RECURRING_DB_ERROR");
    });
  });
});
