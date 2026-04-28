import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProduct, makeTag } from "../__test-fixtures__";

vi.mock("./products.repo", () => ({
  productRepo: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    softDelete: vi.fn(),
    saveTagLink: vi.fn(),
    removeTagLink: vi.fn(),
  },
}));

vi.mock("../tags/tags.service", () => ({
  tagsService: {
    getTag: vi.fn(),
  },
}));

import { productService } from "./products.service";
import { productRepo } from "./products.repo";
import { tagsService } from "../tags/tags.service";

const mockProductRepo = vi.mocked(productRepo);
const mockTagsService = vi.mocked(tagsService);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("productService", () => {
  describe("getProducts", () => {
    it("returns ok with products array on success", async () => {
      const products = [makeProduct(), makeProduct({ id: "product-2" })];
      mockProductRepo.getAll.mockResolvedValue(products as any);

      const [error, data] = await productService.getProducts("user-1");

      expect(error).toBeNull();
      expect(data).toEqual(products);
    });

    it("returns ok with empty array when user has no products", async () => {
      mockProductRepo.getAll.mockResolvedValue([]);

      const [error, data] = await productService.getProducts("user-1");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("returns err with UNEXPECTED_DB_ERROR when repo throws", async () => {
      mockProductRepo.getAll.mockRejectedValue(new Error("DB error"));

      const [error, data] = await productService.getProducts("user-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("getProduct", () => {
    it("returns ok with product when found and owned", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);

      const [error, data] = await productService.getProduct("user-1", "product-1");

      expect(error).toBeNull();
      expect(data).toEqual(product);
    });

    it("returns err with PRODUCT_NOT_FOUND when repo returns null", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error, data] = await productService.getProduct("user-1", "product-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
    });

    it("returns err with PRODUCT_UNAUTHORIZED when userId doesn't match", async () => {
      const product = makeProduct({ userId: "other-user" });
      mockProductRepo.getOne.mockResolvedValue(product as any);

      const [error, data] = await productService.getProduct("user-1", "product-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("PRODUCT_UNAUTHORIZED");
    });

    it("returns err with PRODUCT_DB_ERROR when repo throws", async () => {
      mockProductRepo.getOne.mockRejectedValue(new Error("DB error"));

      const [error, data] = await productService.getProduct("user-1", "product-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("PRODUCT_DB_ERROR");
    });
  });

  describe("addProduct", () => {
    it("returns ok with saved product when no tagIds provided", async () => {
      const product = makeProduct();
      mockProductRepo.save.mockResolvedValue([product] as any);

      const [error, data] = await productService.addProduct({
        userId: "user-1",
        name: "Milk",
      });

      expect(error).toBeNull();
      expect(data).toEqual(product);
      expect(mockProductRepo.saveTagLink).not.toHaveBeenCalled();
    });

    it("calls linkTagToProduct for each tagId when tagIds provided", async () => {
      const product = makeProduct();
      const tag = makeTag();
      mockProductRepo.save.mockResolvedValue([product] as any);
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockTagsService.getTag.mockResolvedValue([null, tag] as any);
      mockProductRepo.saveTagLink.mockResolvedValue([{}] as any);

      await productService.addProduct(
        { userId: "user-1", name: "Milk" },
        ["tag-1", "tag-2"],
      );

      expect(mockProductRepo.saveTagLink).toHaveBeenCalledTimes(2);
    });

    it("returns ok even if tag link call fails", async () => {
      const product = makeProduct();
      mockProductRepo.save.mockResolvedValue([product] as any);
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockTagsService.getTag.mockResolvedValue([
        { reason: "TAG_NOT_FOUND", message: "not found" },
        null,
      ] as any);

      const [error, data] = await productService.addProduct(
        { userId: "user-1", name: "Milk" },
        ["tag-1"],
      );

      expect(error).toBeNull();
      expect(data).toEqual(product);
    });

    it("returns err with PRODUCT_NOT_RETURNED when repo save returns empty array", async () => {
      mockProductRepo.save.mockResolvedValue([]);

      const [error] = await productService.addProduct({
        userId: "user-1",
        name: "Milk",
      });

      expect(error?.reason).toBe("PRODUCT_NOT_RETURNED");
    });

    it("returns err with UNEXPECTED_DB_ERROR when repo save throws", async () => {
      mockProductRepo.save.mockRejectedValue(new Error("DB error"));

      const [error] = await productService.addProduct({
        userId: "user-1",
        name: "Milk",
      });

      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("updateProduct", () => {
    it("returns ok with updated product on success", async () => {
      const product = makeProduct();
      const updated = makeProduct({ name: "Updated Milk" });
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.update.mockResolvedValue([updated] as any);

      const [error, data] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated Milk",
      });

      expect(error).toBeNull();
      expect(data).toEqual(updated);
    });

    it("returns err early when getProduct fails (not found)", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated",
      });

      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockProductRepo.update).not.toHaveBeenCalled();
    });

    it("returns err early when getProduct fails (unauthorized)", async () => {
      const product = makeProduct({ userId: "other-user" });
      mockProductRepo.getOne.mockResolvedValue(product as any);

      const [error] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated",
      });

      expect(error?.reason).toBe("PRODUCT_UNAUTHORIZED");
      expect(mockProductRepo.update).not.toHaveBeenCalled();
    });

    it("returns err with PRODUCT_UPDATE_FAILED when repo update returns empty array", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.update.mockResolvedValue([]);

      const [error] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated",
      });

      expect(error?.reason).toBe("PRODUCT_UPDATE_FAILED");
    });

    it("returns err with UNEXPECTED_DB_ERROR when repo update throws", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.update.mockRejectedValue(new Error("DB error"));

      const [error] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated",
      });

      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("deleteProduct", () => {
    it("returns ok with soft-deleted product on success", async () => {
      const product = makeProduct();
      const deleted = makeProduct({ deletedAt: new Date() });
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.softDelete.mockResolvedValue([deleted] as any);

      const [error, data] = await productService.deleteProduct("user-1", "product-1");

      expect(error).toBeNull();
      expect(data).toEqual(deleted);
    });

    it("returns err early when getProduct fails", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error] = await productService.deleteProduct("user-1", "product-1");

      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockProductRepo.softDelete).not.toHaveBeenCalled();
    });

    it("returns err with PRODUCT_DELETE_FAILED when softDelete returns empty array", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.softDelete.mockResolvedValue([]);

      const [error] = await productService.deleteProduct("user-1", "product-1");

      expect(error?.reason).toBe("PRODUCT_DELETE_FAILED");
    });

    it("returns err with UNEXPECTED_DB_ERROR when softDelete throws", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.softDelete.mockRejectedValue(new Error("DB error"));

      const [error] = await productService.deleteProduct("user-1", "product-1");

      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("linkTagToProduct", () => {
    it("returns ok with success message when product and tag accessible", async () => {
      const product = makeProduct();
      const tag = makeTag();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockTagsService.getTag.mockResolvedValue([null, tag] as any);
      mockProductRepo.saveTagLink.mockResolvedValue([{}] as any);

      const [error, data] = await productService.linkTagToProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
    });

    it("returns err early when getProduct fails", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error] = await productService.linkTagToProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockTagsService.getTag).not.toHaveBeenCalled();
    });

    it("returns err early when tagsService.getTag fails", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockTagsService.getTag.mockResolvedValue([
        { reason: "TAG_NOT_FOUND", message: "not found" },
        null,
      ] as any);

      const [error] = await productService.linkTagToProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error?.reason).toBe("TAG_NOT_FOUND");
      expect(mockProductRepo.saveTagLink).not.toHaveBeenCalled();
    });
  });

  describe("unlinkTagFromProduct", () => {
    it("returns ok with success message when link removed", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.removeTagLink.mockResolvedValue([{}] as any);

      const [error, data] = await productService.unlinkTagFromProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
    });

    it("returns err early when getProduct fails", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error] = await productService.unlinkTagFromProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockProductRepo.removeTagLink).not.toHaveBeenCalled();
    });

    it("returns err with TAG_PRODUCT_LINK_NOT_FOUND when removeTagLink returns empty array", async () => {
      const product = makeProduct();
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.removeTagLink.mockResolvedValue([]);

      const [error] = await productService.unlinkTagFromProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error?.reason).toBe("TAG_PRODUCT_LINK_NOT_FOUND");
    });
  });
});
