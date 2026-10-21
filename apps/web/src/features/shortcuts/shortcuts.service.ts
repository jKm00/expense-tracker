import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { getLogger } from "../logger/logger.context";
import { productService } from "../products/products.service";
import { shortcutRepo } from "./shortcuts.repo";
import { CreateShortcutDTO } from "./shortcuts.dtos";

type ShortcutInput = Omit<CreateShortcutDTO, "price" | "store"> & {
  price?: string | null;
  store?: string;
};

async function getShortcuts(userId: string) {
  getLogger().addAttrs({ shortcutAction: "getShortcuts" });

  try {
    const items = await shortcutRepo.getAll(userId);
    getLogger().addAttrs({ shortcutCount: items.length });
    return ok(items);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: "Failed to fetch shortcuts",
    });
  }
}

async function getShortcut(userId: string, shortcutId: string) {
  getLogger().addAttrs({ shortcutAction: "getShortcut", shortcutId });

  try {
    const item = await shortcutRepo.getOne(userId, shortcutId);
    if (!item || item.deletedAt) {
      return err({
        reason: "SHORTCUT_NOT_FOUND" as const,
        message: `Shortcut with id ${shortcutId} not found`,
      });
    }

    return ok(item);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: `Failed to fetch shortcut (${shortcutId})`,
    });
  }
}

function toRow(data: ShortcutInput) {
  return {
    name: data.name,
    store: data.store || null,
    type: data.type,
    price: data.price ?? null,
  };
}

async function createShortcut(userId: string, data: ShortcutInput) {
  getLogger().addAttrs({
    shortcutAction: "createShortcut",
    shortcutType: data.type,
    shortcutProductCount: data.productIds.length,
    shortcutAsksPrice: data.price == null,
  });

  const productIds = [...new Set(data.productIds)];
  const [productError] = await productService.assertProductsOwned(
    userId,
    productIds,
  );
  if (productError) {
    return err(productError);
  }

  try {
    const saved = await shortcutRepo.save(
      { userId, ...toRow(data) },
      productIds,
    );
    getLogger().addAttrs({ shortcutId: saved.id });
    return ok(saved);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: "Failed to save shortcut",
    });
  }
}

async function updateShortcut(
  userId: string,
  shortcutId: string,
  data: ShortcutInput,
) {
  getLogger().addAttrs({ shortcutAction: "updateShortcut", shortcutId });

  const [foundError] = await getShortcut(userId, shortcutId);
  if (foundError) {
    return err(foundError);
  }

  const productIds = [...new Set(data.productIds)];
  const [productError] = await productService.assertProductsOwned(
    userId,
    productIds,
  );
  if (productError) {
    return err(productError);
  }

  try {
    const updated = await shortcutRepo.update(
      userId,
      shortcutId,
      toRow(data),
      productIds,
    );
    return ok(updated);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: `Failed to update shortcut (${shortcutId})`,
    });
  }
}

async function deleteShortcut(userId: string, shortcutId: string) {
  getLogger().addAttrs({ shortcutAction: "deleteShortcut", shortcutId });

  const [foundError] = await getShortcut(userId, shortcutId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const [deleted] = await shortcutRepo.softDelete(userId, shortcutId);
    return ok(deleted);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: `Failed to delete shortcut (${shortcutId})`,
    });
  }
}

async function reorderShortcuts(userId: string, shortcutIds: string[]) {
  getLogger().addAttrs({
    shortcutAction: "reorderShortcuts",
    shortcutCount: shortcutIds.length,
  });

  const [shortcutsError, owned] = await getShortcuts(userId);
  if (shortcutsError) {
    return err(shortcutsError);
  }

  const ownedIds = new Set(owned.map((s) => s.id));
  const uniqueIds = [...new Set(shortcutIds)];
  if (uniqueIds.some((id) => !ownedIds.has(id))) {
    return err({
      reason: "SHORTCUT_NOT_FOUND" as const,
      message: "One or more shortcuts could not be found",
    });
  }

  try {
    await shortcutRepo.reorder(userId, uniqueIds);
    return ok(uniqueIds);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: "Failed to reorder shortcuts",
    });
  }
}

export const shortcutService = {
  reorderShortcuts,
  getShortcuts,
  getShortcut,
  createShortcut,
  updateShortcut,
  deleteShortcut,
};
