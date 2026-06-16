import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProduct, makeTag } from "@/features/__test-fixtures__";

vi.mock("./products.repo", () => ({
  productRepo: {
    getAll: vi.fn(),
    getPage: vi.fn(),
    getKpis: vi.fn(),
    getOne: vi.fn(),
    getAlias: vi.fn(),
    getAliasByNormalizedName: vi.fn(),
    getStats: vi.fn(),
    save: vi.fn(),
    saveAlias: vi.fn(),
    updateAlias: vi.fn(),
    removeAlias: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    softDelete: vi.fn(),
    saveTagLink: vi.fn(),
    removeTagLink: vi.fn(),
  },
}));

vi.mock("@/features/tags/server/tags.service", () => ({
  tagsService: {
    getTag: vi.fn(),
  },
}));

import { productService } from "./products.service";
import { productRepo } from "./products.repo";
import { tagsService } from "@/features/tags/server/tags.service";

const mockProductRepo = vi.mocked(productRepo);
const mockTagsService = vi.mocked(tagsService);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeAlias(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "alias-1",
    productId: "product-1",
    name: "Milk",
    normalizedName: "milk",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("productService", () => {
  describe("getProducts", () => {
    it("returns ok with products array on success", async () => {
      const products = [
        makeProduct({ aliases: [] }),
        makeProduct({ id: "product-2", aliases: [makeAlias({ id: "alias-2" })] }),
      ];
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

  describe("getProductKpis", () => {
    it("returns product counts from repo aggregates", async () => {
      mockProductRepo.getKpis.mockResolvedValue({
        total: 12,
        tagged: 7,
      } as any);

      const [error, data] = await productService.getProductKpis("user-1");

      expect(error).toBeNull();
      expect(data).toEqual({
        total: 12,
        tagged: 7,
        untagged: 5,
      });
    });

    it("returns UNEXPECTED_DB_ERROR when repo throws", async () => {
      mockProductRepo.getKpis.mockRejectedValue(new Error("DB error"));

      const [error, data] = await productService.getProductKpis("user-1");

      expect(data).toBeNull();
      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("listProducts", () => {
    it("returns a trimmed page with hasMore and nextOffset", async () => {
      const products = [
        makeProduct({ id: "product-1", aliases: [] }),
        makeProduct({ id: "product-2", aliases: [] }),
        makeProduct({ id: "product-3", aliases: [] }),
      ];
      mockProductRepo.getPage.mockResolvedValue(products as any);

      const [error, data] = await productService.listProducts("user-1", {
        offset: 10,
        limit: 2,
        group: "tagged",
        search: " melk ",
      });

      expect(error).toBeNull();
      expect(data).toEqual({
        products: products.slice(0, 2),
        hasMore: true,
        nextOffset: 12,
      });
      expect(mockProductRepo.getPage).toHaveBeenCalledWith({
        userId: "user-1",
        offset: 10,
        limit: 3,
        group: "tagged",
        search: "melk",
      });
    });

    it("returns an empty page without nextOffset when repo returns no results", async () => {
      mockProductRepo.getPage.mockResolvedValue([] as any);

      const [error, data] = await productService.listProducts("user-1", {
        offset: 0,
        limit: 25,
      });

      expect(error).toBeNull();
      expect(data).toEqual({
        products: [],
        hasMore: false,
        nextOffset: null,
      });
    });

    it("returns UNEXPECTED_DB_ERROR when repo throws", async () => {
      mockProductRepo.getPage.mockRejectedValue(new Error("DB error"));

      const [error, data] = await productService.listProducts("user-1", {
        offset: 0,
        limit: 25,
      });

      expect(data).toBeNull();
      expect(error?.reason).toBe("UNEXPECTED_DB_ERROR");
    });
  });

  describe("getProduct", () => {
    it("returns ok with product when found and owned", async () => {
      const product = makeProduct({ aliases: [] });
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
      const product = makeProduct({ userId: "other-user", aliases: [] });
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

  describe("getProductStats", () => {
    it("returns ok with stats when product exists and repo succeeds", async () => {
      const product = makeProduct({ aliases: [] });
      const stats = {
        purchaseCount: 3,
        totalQuantity: 6,
        totalSpent: "120.50",
        totalIncome: "10.00",
        lastPurchasedAt: new Date("2024-02-15"),
      };

      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.getStats.mockResolvedValue(stats as any);

      const [error, data] = await productService.getProductStats(
        "user-1",
        "product-1",
      );

      expect(error).toBeNull();
      expect(data).toEqual(stats);
      expect(mockProductRepo.getStats).toHaveBeenCalledWith("product-1");
    });

    it("returns err early when getProduct fails", async () => {
      mockProductRepo.getOne.mockResolvedValue(undefined);

      const [error, data] = await productService.getProductStats(
        "user-1",
        "product-1",
      );

      expect(data).toBeNull();
      expect(error?.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockProductRepo.getStats).not.toHaveBeenCalled();
    });
  });

  describe("addProduct", () => {
    it("returns ok with saved product", async () => {
      const product = makeProduct({ aliases: [] });
      mockProductRepo.save.mockResolvedValue([product] as any);

      const [error, data] = await productService.addProduct({
        userId: "user-1",
        name: "Milk",
      });

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
  });

  describe("updateProduct", () => {
    it("returns ok with updated product on success", async () => {
      const product = makeProduct({ aliases: [] });
      const updated = makeProduct({ name: "Updated Milk", aliases: [] });
      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.update.mockResolvedValue([updated] as any);
      mockProductRepo.getAliasByNormalizedName.mockResolvedValue(undefined);

      const [error, data] = await productService.updateProduct("user-1", "product-1", {
        name: "Updated Milk",
      });

      expect(error).toBeNull();
      expect(data).toEqual(updated);
    });

    it("removes matching alias when canonical rename collides", async () => {
      const product = makeProduct({ aliases: [] });
      const updated = makeProduct({ name: "Whole Milk", aliases: [] });
      const alias = makeAlias({
        id: "alias-2",
        productId: "product-1",
        name: "Whole Milk",
        normalizedName: "whole milk",
      });

      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.update.mockResolvedValue([updated] as any);
      mockProductRepo.getAliasByNormalizedName.mockResolvedValue(alias as any);
      mockProductRepo.removeAlias.mockResolvedValue([alias] as any);

      const [error] = await productService.updateProduct("user-1", "product-1", {
        name: "Whole Milk",
      });

      expect(error).toBeNull();
      expect(mockProductRepo.removeAlias).toHaveBeenCalledWith("alias-2");
    });
  });

  describe("addProductAlias", () => {
    it("returns ok when alias is added", async () => {
      const product = makeProduct({ name: "Milk", aliases: [] });
      const alias = makeAlias({ id: "alias-2", name: "Skim Milk", normalizedName: "skim milk" });

      mockProductRepo.getOne.mockResolvedValue(product as any);
      mockProductRepo.getAliasByNormalizedName.mockResolvedValue(undefined);
      mockProductRepo.saveAlias.mockResolvedValue([alias] as any);

      const [error, data] = await productService.addProductAlias(
        "user-1",
        "product-1",
        "Skim Milk",
      );

      expect(error).toBeNull();
      expect(data).toEqual(alias);
    });

    it("returns PRODUCT_ALIAS_EQUALS_CANONICAL when alias matches canonical", async () => {
      const product = makeProduct({ name: "Milk", aliases: [] });
      mockProductRepo.getOne.mockResolvedValue(product as any);

      const [error] = await productService.addProductAlias(
        "user-1",
        "product-1",
        " milk ",
      );

      expect(error?.reason).toBe("PRODUCT_ALIAS_EQUALS_CANONICAL");
    });
  });

  describe("updateProductAlias", () => {
    it("returns PRODUCT_ALIAS_NOT_FOUND when alias is missing", async () => {
      mockProductRepo.getAlias.mockResolvedValue(undefined);

      const [error] = await productService.updateProductAlias(
        "user-1",
        "alias-missing",
        "Skim Milk",
      );

      expect(error?.reason).toBe("PRODUCT_ALIAS_NOT_FOUND");
    });

    it("returns PRODUCT_UNAUTHORIZED when alias belongs to other user", async () => {
      mockProductRepo.getAlias.mockResolvedValue(makeAlias() as any);
      mockProductRepo.getOne.mockResolvedValue(
        makeProduct({ userId: "other-user", aliases: [] }) as any,
      );

      const [error] = await productService.updateProductAlias(
        "user-1",
        "alias-1",
        "Skim Milk",
      );

      expect(error?.reason).toBe("PRODUCT_UNAUTHORIZED");
    });

    it("updates alias when valid", async () => {
      const alias = makeAlias({ id: "alias-1", name: "Whole Milk", normalizedName: "whole milk" });
      const updatedAlias = makeAlias({ id: "alias-1", name: "Skim Milk", normalizedName: "skim milk" });

      mockProductRepo.getAlias.mockResolvedValue(alias as any);
      mockProductRepo.getOne.mockResolvedValue(makeProduct({ aliases: [] }) as any);
      mockProductRepo.getAliasByNormalizedName.mockResolvedValue(undefined);
      mockProductRepo.updateAlias.mockResolvedValue([updatedAlias] as any);

      const [error, data] = await productService.updateProductAlias(
        "user-1",
        "alias-1",
        "Skim Milk",
      );

      expect(error).toBeNull();
      expect(data).toEqual(updatedAlias);
    });
  });

  describe("deleteProductAlias", () => {
    it("returns PRODUCT_ALIAS_NOT_FOUND when alias is missing", async () => {
      mockProductRepo.getAlias.mockResolvedValue(undefined);

      const [error] = await productService.deleteProductAlias(
        "user-1",
        "alias-missing",
      );

      expect(error?.reason).toBe("PRODUCT_ALIAS_NOT_FOUND");
    });

    it("deletes alias for owner", async () => {
      mockProductRepo.getAlias.mockResolvedValue(makeAlias() as any);
      mockProductRepo.getOne.mockResolvedValue(makeProduct({ aliases: [] }) as any);
      mockProductRepo.removeAlias.mockResolvedValue([makeAlias()] as any);

      const [error, data] = await productService.deleteProductAlias(
        "user-1",
        "alias-1",
      );

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
    });
  });

  describe("linkTagToProduct", () => {
    it("returns ok when product and tag are accessible", async () => {
      mockProductRepo.getOne.mockResolvedValue(makeProduct({ aliases: [] }) as any);
      mockTagsService.getTag.mockResolvedValue([null, makeTag()] as any);
      mockProductRepo.saveTagLink.mockResolvedValue([{}] as any);

      const [error, data] = await productService.linkTagToProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
    });
  });

  describe("unlinkTagFromProduct", () => {
    it("returns ok when product-tag link is removed", async () => {
      mockProductRepo.getOne.mockResolvedValue(makeProduct({ aliases: [] }) as any);
      mockProductRepo.removeTagLink.mockResolvedValue([{}] as any);

      const [error, data] = await productService.unlinkTagFromProduct(
        "user-1",
        "product-1",
        "tag-1",
      );

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
    });
  });
});
