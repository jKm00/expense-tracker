import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { getLogger } from "../logger/logger.context";
import { productService } from "../products/products.service";
import { transactionService } from "../transactions/transactions.service";
import {
  AddShoppingItemDTO,
  CompleteShoppingDTO,
} from "./shopping.dtos";
import { shoppingRepo } from "./shopping.repo";

async function getShoppingList(userId: string) {
  const logger = getLogger();
  logger.addAttrs({ shoppingAction: "getShoppingList" });

  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (!list) {
      return err({
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to load shopping list for user ${userId}`,
      });
    }

    logger.addAttrs({ shoppingListId: list.id, shoppingItemCount: list.items.length });
    return ok(list);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to load shopping list for user ${userId}`,
    });
  }
}

async function getOwnedListItem(userId: string, shoppingItemId: string) {
  try {
    const item = await shoppingRepo.getShoppingListItemById(shoppingItemId);
    if (!item) {
      return err({
        reason: "SHOPPING_ITEM_NOT_FOUND" as const,
        message: `Shopping item with id ${shoppingItemId} not found`,
      });
    }

    if (item.list.userId !== userId) {
      return err({
        reason: "SHOPPING_UNAUTHORIZED" as const,
        message: `User with id ${userId} does not have access to shopping item with id ${shoppingItemId}`,
      });
    }

    return ok(item);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to load shopping item ${shoppingItemId}`,
    });
  }
}

async function addShoppingItem(userId: string, data: AddShoppingItemDTO) {
  const logger = getLogger();
  logger.addAttrs({
    shoppingAction: "addShoppingItem",
    productId: data.product.id,
    shoppingProductWasExisting: Boolean(data.product.id),
  });

  const productResult = data.product.id
    ? await productService.getProduct(userId, data.product.id)
    : await productService.addProduct({
        userId,
        name: data.product.name,
      });

  const [productError, product] = productResult;
  if (productError || !product) {
    return err(
      productError ?? {
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to resolve product for user ${userId}`,
      },
    );
  }

  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (!list) {
      return err({
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to load shopping list for user ${userId}`,
      });
    }

    const existing = await shoppingRepo.getShoppingListItemByListAndProduct(
      list.id,
      product.id,
    );

    if (existing) {
      await shoppingRepo.touchShoppingList(list.id);
      logger.addAttrs({
        shoppingListId: list.id,
        shoppingItemId: existing.id,
        shoppingItemAlreadyExisted: true,
      });
      return ok(existing);
    }

    const saved = await shoppingRepo.saveShoppingListItem({
      shoppingListId: list.id,
      productId: product.id,
      checked: false,
    });

    if (saved.length === 0) {
      return err({
        reason: "SHOPPING_ITEM_NOT_RETURNED" as const,
        message: "No shopping item returned after saving",
      });
    }

    await shoppingRepo.touchShoppingList(list.id);
    logger.addAttrs({
      shoppingListId: list.id,
      shoppingItemId: saved[0].id,
      shoppingItemAlreadyExisted: false,
    });

    return ok({
      ...saved[0],
      product,
    });
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to add shopping item for user ${userId}`,
    });
  }
}

async function toggleShoppingItem(
  userId: string,
  shoppingItemId: string,
  checked: boolean,
) {
  const logger = getLogger();
  logger.addAttrs({
    shoppingAction: "toggleShoppingItem",
    shoppingItemId,
    shoppingChecked: checked,
  });

  const [foundError, item] = await getOwnedListItem(userId, shoppingItemId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const updated = await shoppingRepo.updateShoppingListItem(shoppingItemId, {
      checked,
    });

    if (updated.length === 0) {
      return err({
        reason: "SHOPPING_ITEM_NOT_FOUND" as const,
        message: `Shopping item ${shoppingItemId} no longer exists`,
      });
    }

    await shoppingRepo.touchShoppingList(item.list.id);
    logger.addAttrs({ shoppingListId: item.list.id });

    return ok(updated[0]);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to toggle shopping item ${shoppingItemId}`,
    });
  }
}

async function removeShoppingItem(userId: string, shoppingItemId: string) {
  const logger = getLogger();
  logger.addAttrs({ shoppingAction: "removeShoppingItem", shoppingItemId });

  const [foundError, item] = await getOwnedListItem(userId, shoppingItemId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const removed = await shoppingRepo.removeShoppingListItem(shoppingItemId);
    if (removed.length === 0) {
      return err({
        reason: "SHOPPING_ITEM_NOT_FOUND" as const,
        message: `Shopping item ${shoppingItemId} no longer exists`,
      });
    }

    await shoppingRepo.touchShoppingList(item.list.id);
    logger.addAttrs({ shoppingListId: item.list.id });

    return ok(removed[0]);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to remove shopping item ${shoppingItemId}`,
    });
  }
}

async function clearCompletedShoppingItems(userId: string) {
  const logger = getLogger();
  logger.addAttrs({ shoppingAction: "clearCompletedShoppingItems" });

  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (!list) {
      return err({
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to load shopping list for user ${userId}`,
      });
    }

    const checkedItemIds = list.items
      .filter((item) => item.checked)
      .map((item) => item.id);

    if (checkedItemIds.length === 0) {
      logger.addAttrs({ shoppingListId: list.id, shoppingItemCount: 0 });
      return ok([]);
    }

    const removed = await shoppingRepo.removeShoppingListItemsByIds(
      list.id,
      checkedItemIds,
    );

    await shoppingRepo.touchShoppingList(list.id);
    logger.addAttrs({
      shoppingListId: list.id,
      shoppingItemCount: removed.length,
    });

    return ok(removed);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to clear completed shopping items for user ${userId}`,
    });
  }
}

async function clearShoppingList(userId: string) {
  const logger = getLogger();
  logger.addAttrs({ shoppingAction: "clearShoppingList" });

  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (!list) {
      return err({
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to load shopping list for user ${userId}`,
      });
    }

    if (list.items.length === 0) {
      logger.addAttrs({ shoppingListId: list.id, shoppingItemCount: 0 });
      return ok([]);
    }

    const removed = await shoppingRepo.clearShoppingList(list.id);

    await shoppingRepo.touchShoppingList(list.id);
    logger.addAttrs({
      shoppingListId: list.id,
      shoppingItemCount: removed.length,
    });

    return ok(removed);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to clear shopping list for user ${userId}`,
    });
  }
}

async function completeShopping(userId: string, data: CompleteShoppingDTO) {
  const logger = getLogger();
  logger.addAttrs({
    shoppingAction: "completeShopping",
    shoppingItemCount: data.shoppingItemIds.length,
    shoppingEntryCount: data.entries.length,
    shoppingKeepUncheckedItems: data.keepUncheckedItems,
    transactionId: data.transactionId,
  });

  if (data.shoppingItemIds.length === 0) {
    return err({
      reason: "SHOPPING_NO_CHECKED_ITEMS" as const,
      message: "Need at least one checked item to complete checkout",
    });
  }

  const checkoutEntries = data.entries.map(({ shoppingItemId, ...entry }) => entry);

  const linkedTransactionMetadata = {
    ...(data.store?.trim() ? { store: data.store } : {}),
    ...(data.description?.trim() ? { description: data.description } : {}),
    source: "shopping" as const,
  };

  const [transactionError, transaction] = data.transactionId
    ? await transactionService.updateTransaction(userId, data.transactionId, {
        transaction: linkedTransactionMetadata,
        entries: checkoutEntries,
      })
    : await transactionService.saveTransaction({
        transaction: {
          userId,
          store: data.store,
          description: data.description,
          date: data.date,
          source: "shopping",
        },
        entries: checkoutEntries,
      });

  if (transactionError) {
    return err(transactionError);
  }

  if (!transaction) {
    return err({
      reason: "SHOPPING_TRANSACTION_NOT_RETURNED" as const,
      message: "No transaction returned after completing shopping",
    });
  }

  logger.addAttrs({ transactionId: transaction.id });

  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (list) {
      if (data.keepUncheckedItems) {
        const uniqueIds = Array.from(new Set(data.shoppingItemIds));
        await shoppingRepo.removeShoppingListItemsByIds(list.id, uniqueIds);
      } else {
        await shoppingRepo.clearShoppingList(list.id);
      }

      await shoppingRepo.touchShoppingList(list.id);
    }
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Transaction was created, but shopping list cleanup failed for user ${userId}`,
    });
  }

  return ok(transaction);
}

export const shoppingService = {
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  removeShoppingItem,
  clearCompletedShoppingItems,
  clearShoppingList,
  completeShopping,
};
