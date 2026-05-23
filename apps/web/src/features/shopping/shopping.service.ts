import { err, ok } from "@/utils/result";
import { productService } from "../products/products.service";
import { transactionService } from "../transactions/transactions.service";
import {
  AddShoppingItemDTO,
  CompleteShoppingDTO,
} from "./shopping.dtos";
import { shoppingRepo } from "./shopping.repo";

async function getShoppingList(userId: string) {
  try {
    const list = await shoppingRepo.getOrCreateShoppingList(userId);
    if (!list) {
      return err({
        reason: "SHOPPING_DB_ERROR" as const,
        message: `Failed to load shopping list for user ${userId}`,
      });
    }

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

    return ok(updated[0]);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to toggle shopping item ${shoppingItemId}`,
    });
  }
}

async function removeShoppingItem(userId: string, shoppingItemId: string) {
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

    return ok(removed[0]);
  } catch (error) {
    return err({
      reason: "SHOPPING_DB_ERROR" as const,
      message: `Failed to remove shopping item ${shoppingItemId}`,
    });
  }
}

async function completeShopping(userId: string, data: CompleteShoppingDTO) {
  if (data.shoppingItemIds.length === 0) {
    return err({
      reason: "SHOPPING_NO_CHECKED_ITEMS" as const,
      message: "Need at least one checked item to complete checkout",
    });
  }

  const [transactionError, transaction] = await transactionService.saveTransaction({
    transaction: {
      userId,
      store: data.store,
      description: data.description,
      date: data.date,
      source: "shopping",
    },
    entries: data.entries.map(({ shoppingItemId, ...entry }) => entry),
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
  completeShopping,
};
