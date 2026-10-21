import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./shortcuts.repo", () => ({
  shortcutRepo: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    setShowOnHome: vi.fn(),
    reorder: vi.fn(),
  },
}));

vi.mock("../products/products.service", () => ({
  productService: {
    getProduct: vi.fn(),
  },
}));

import { shortcutService } from "./shortcuts.service";
import { shortcutRepo } from "./shortcuts.repo";
import { productService } from "../products/products.service";
import { ShortcutWithProducts } from "./shortcuts.models";

const repo = vi.mocked(shortcutRepo);
const products = vi.mocked(productService);

function makeShortcut(
  overrides: Partial<ShortcutWithProducts> = {},
): ShortcutWithProducts {
  return {
    id: "s1",
    userId: "u1",
    name: "Energy drink",
    store: null,
    type: "expense",
    price: "25.00",
    showOnHome: false,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    products: [{ id: "p1", name: "Energy drink" }],
    ...overrides,
  };
}

const input = {
  name: "Canteen",
  type: "expense" as const,
  price: null,
  productIds: ["p1", "p2", "p1"],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("shortcutService", () => {
  describe("getShortcuts", () => {
    it("returns the user's shortcuts", async () => {
      repo.getAll.mockResolvedValue([makeShortcut()]);
      const [error, items] = await shortcutService.getShortcuts("u1");
      expect(error).toBeNull();
      expect(items).toHaveLength(1);
    });

    it("returns SHORTCUT_DB_ERROR when the repo throws", async () => {
      repo.getAll.mockRejectedValue(new Error("boom"));
      const [error] = await shortcutService.getShortcuts("u1");
      expect(error?.reason).toBe("SHORTCUT_DB_ERROR");
    });
  });

  describe("getShortcut", () => {
    it("returns SHORTCUT_NOT_FOUND when missing or deleted", async () => {
      repo.getOne.mockResolvedValue(null);
      expect((await shortcutService.getShortcut("u1", "s1"))[0]?.reason).toBe(
        "SHORTCUT_NOT_FOUND",
      );

      repo.getOne.mockResolvedValue(makeShortcut({ deletedAt: new Date() }));
      expect((await shortcutService.getShortcut("u1", "s1"))[0]?.reason).toBe(
        "SHORTCUT_NOT_FOUND",
      );
    });

    it("returns SHORTCUT_UNAUTHORIZED for another user's shortcut", async () => {
      repo.getOne.mockResolvedValue(makeShortcut({ userId: "other" }));
      const [error] = await shortcutService.getShortcut("u1", "s1");
      expect(error?.reason).toBe("SHORTCUT_UNAUTHORIZED");
    });
  });

  describe("createShortcut", () => {
    it("saves with de-duplicated product ids and a null price to ask", async () => {
      products.getProduct.mockResolvedValue([null, {} as never]);
      repo.save.mockResolvedValue(makeShortcut() as never);

      const [error] = await shortcutService.createShortcut("u1", input);

      expect(error).toBeNull();
      expect(products.getProduct).toHaveBeenCalledTimes(2);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", price: null, store: null }),
        ["p1", "p2"],
      );
    });

    it("does not save when a product is not owned by the user", async () => {
      products.getProduct.mockResolvedValue([
        { reason: "PRODUCT_UNAUTHORIZED", message: "no" },
        null,
      ] as never);

      const [error] = await shortcutService.createShortcut("u1", input);

      expect(error?.reason).toBe("PRODUCT_UNAUTHORIZED");
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("returns SHORTCUT_DB_ERROR when saving fails", async () => {
      products.getProduct.mockResolvedValue([null, {} as never]);
      repo.save.mockRejectedValue(new Error("boom"));
      const [error] = await shortcutService.createShortcut("u1", input);
      expect(error?.reason).toBe("SHORTCUT_DB_ERROR");
    });
  });

  describe("updateShortcut", () => {
    it("rejects updates to another user's shortcut", async () => {
      repo.getOne.mockResolvedValue(makeShortcut({ userId: "other" }));
      const [error] = await shortcutService.updateShortcut("u1", "s1", input);
      expect(error?.reason).toBe("SHORTCUT_UNAUTHORIZED");
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("updates the shortcut and its products", async () => {
      repo.getOne.mockResolvedValue(makeShortcut());
      products.getProduct.mockResolvedValue([null, {} as never]);
      repo.update.mockResolvedValue(makeShortcut() as never);

      const [error] = await shortcutService.updateShortcut("u1", "s1", input);

      expect(error).toBeNull();
      expect(repo.update).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ name: "Canteen", price: null }),
        ["p1", "p2"],
      );
    });
  });

  describe("reorderShortcuts", () => {
    it("saves the given order for owned shortcuts", async () => {
      repo.getAll.mockResolvedValue([
        makeShortcut({ id: "a" }),
        makeShortcut({ id: "b" }),
      ]);
      const [error] = await shortcutService.reorderShortcuts("u1", ["b", "a"]);
      expect(error).toBeNull();
      expect(repo.reorder).toHaveBeenCalledWith("u1", ["b", "a"]);
    });

    it("rejects ids the user does not own", async () => {
      repo.getAll.mockResolvedValue([makeShortcut({ id: "a" })]);
      const [error] = await shortcutService.reorderShortcuts("u1", ["x"]);
      expect(error?.reason).toBe("SHORTCUT_NOT_FOUND");
      expect(repo.reorder).not.toHaveBeenCalled();
    });
  });

  describe("deleteShortcut", () => {
    it("soft deletes an owned shortcut", async () => {
      repo.getOne.mockResolvedValue(makeShortcut());
      repo.softDelete.mockResolvedValue([makeShortcut()] as never);
      const [error] = await shortcutService.deleteShortcut("u1", "s1");
      expect(error).toBeNull();
      expect(repo.softDelete).toHaveBeenCalledWith("s1");
    });

    it("does not delete another user's shortcut", async () => {
      repo.getOne.mockResolvedValue(makeShortcut({ userId: "other" }));
      const [error] = await shortcutService.deleteShortcut("u1", "s1");
      expect(error?.reason).toBe("SHORTCUT_UNAUTHORIZED");
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
