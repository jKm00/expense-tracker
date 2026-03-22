import { describe, it, expect, vi, beforeEach } from "vitest";
import { productService } from "./product.service";
import { productRepo } from "./product.repo";

vi.mock("./product.repo", () => ({
  productRepo: {
    get: vi.fn(),
    getByName: vi.fn(),
    getAll: vi.fn(),
    getUntaggedProducts: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    deleteProduct: vi.fn(),
    getUsage: vi.fn(),
  },
}));

const mockRepo = vi.mocked(productRepo);

const mockProduct = {
  id: "prod-1",
  userId: "user-1",
  name: "Coffee",
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
};

describe("productService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProduct", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.updateProduct("user-1", "prod-1", {
        name: "New Name",
      });

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("returns error when user does not own product", async () => {
      mockRepo.get.mockResolvedValue({
        ...mockProduct,
        userId: "other-user",
      });

      const [err] = await productService.updateProduct("user-1", "prod-1", {
        name: "New Name",
      });

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_FORBIDDEN");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("updates and returns product when user owns it", async () => {
      const updated = { ...mockProduct, name: "New Name" };
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.update.mockResolvedValue(updated);

      const [err, data] = await productService.updateProduct(
        "user-1",
        "prod-1",
        { name: "New Name" },
      );

      expect(err).toBeNull();
      expect(data).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith("prod-1", {
        name: "New Name",
      });
    });
  });

  describe("deleteProduct", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.deleteProduct("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockRepo.deleteProduct).not.toHaveBeenCalled();
    });

    it("returns error when user does not own product", async () => {
      mockRepo.get.mockResolvedValue({
        ...mockProduct,
        userId: "other-user",
      });

      const [err] = await productService.deleteProduct("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_FORBIDDEN");
      expect(mockRepo.deleteProduct).not.toHaveBeenCalled();
    });

    it("deletes and returns product when user owns it", async () => {
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.deleteProduct.mockResolvedValue(mockProduct);

      const [err, data] = await productService.deleteProduct(
        "user-1",
        "prod-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(mockProduct);
      expect(mockRepo.deleteProduct).toHaveBeenCalledWith("prod-1");
    });
  });

  describe("getProductUsage", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.getProductUsage("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
    });

    it("returns usage data when product exists and user owns it", async () => {
      const usage = { transactionCount: 5, hasRecurring: true };
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.getUsage.mockResolvedValue(usage);

      const [err, data] = await productService.getProductUsage(
        "user-1",
        "prod-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(usage);
      expect(mockRepo.getUsage).toHaveBeenCalledWith("prod-1");
    });
  });
});
