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
    const item = await shortcutRepo.getOne(shortcutId);
    if (!item || item.deletedAt) {
      return err({
        reason: "SHORTCUT_NOT_FOUND" as const,
        message: `Shortcut with id ${shortcutId} not found`,
      });
    }

    if (item.userId !== userId) {
      return err({
        reason: "SHORTCUT_UNAUTHORIZED" as const,
        message: `User ${userId} does not have access to shortcut ${shortcutId}`,
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

async function assertProductOwnership(userId: string, productIds: string[]) {
  for (const productId of productIds) {
    const [productError] = await productService.getProduct(userId, productId);
    if (productError) {
      return err(productError);
    }
  }
  return ok(null);
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
  const [productError] = await assertProductOwnership(userId, productIds);
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
  const [productError] = await assertProductOwnership(userId, productIds);
  if (productError) {
    return err(productError);
  }

  try {
    const updated = await shortcutRepo.update(
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
    const [deleted] = await shortcutRepo.softDelete(shortcutId);
    return ok(deleted);
  } catch {
    return err({
      reason: "SHORTCUT_DB_ERROR" as const,
      message: `Failed to delete shortcut (${shortcutId})`,
    });
  }
}

export const shortcutService = {
  getShortcuts,
  getShortcut,
  createShortcut,
  updateShortcut,
  deleteShortcut,
};
