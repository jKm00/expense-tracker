import { db } from "@/lib/db";
import { products } from "@/features/products/server/products.schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  shoppingListItems,
  shoppingLists,
} from "./shopping.schema";
import {
  NewShoppingList,
  NewShoppingListItem,
  ShoppingListItemWithProduct,
  ShoppingListWithItems,
} from "@/features/shopping/shared/shopping.models";

function isUniqueConstraintError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  return (error as { code?: string }).code === "23505";
}

async function getShoppingListByUser(userId: string) {
  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .limit(1);

  if (!list) {
    return null;
  }

  const rows = await db
    .select({ item: shoppingListItems, product: products })
    .from(shoppingListItems)
    .innerJoin(products, eq(shoppingListItems.productId, products.id))
    .where(eq(shoppingListItems.shoppingListId, list.id))
    .orderBy(asc(shoppingListItems.createdAt));

  return {
    ...list,
    items: rows.map(({ item, product }) => ({
      ...item,
      product,
    })),
  } satisfies ShoppingListWithItems;
}

async function createShoppingList(data: NewShoppingList) {
  try {
    return await db.insert(shoppingLists).values(data).returning();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return [];
    }

    throw error;
  }
}

async function getOrCreateShoppingList(userId: string) {
  const existing = await getShoppingListByUser(userId);
  if (existing) {
    return existing;
  }

  const created = await createShoppingList({ userId });
  if (created.length === 0) {
    return await getShoppingListByUser(userId);
  }

  return {
    ...created[0],
    items: [],
  } satisfies ShoppingListWithItems;
}

async function getShoppingListItemById(itemId: string) {
  const [row] = await db
    .select({ item: shoppingListItems, product: products, list: shoppingLists })
    .from(shoppingListItems)
    .innerJoin(shoppingLists, eq(shoppingListItems.shoppingListId, shoppingLists.id))
    .innerJoin(products, eq(shoppingListItems.productId, products.id))
    .where(eq(shoppingListItems.id, itemId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row.item,
    product: row.product,
    list: row.list,
  };
}

async function getShoppingListItemByListAndProduct(
  shoppingListId: string,
  productId: string,
) {
  const [row] = await db
    .select({ item: shoppingListItems, product: products })
    .from(shoppingListItems)
    .innerJoin(products, eq(shoppingListItems.productId, products.id))
    .where(
      and(
        eq(shoppingListItems.shoppingListId, shoppingListId),
        eq(shoppingListItems.productId, productId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row.item,
    product: row.product,
  } satisfies ShoppingListItemWithProduct;
}

async function saveShoppingListItem(data: NewShoppingListItem) {
  return await db.insert(shoppingListItems).values(data).returning();
}

async function updateShoppingListItem(
  itemId: string,
  data: Partial<Pick<NewShoppingListItem, "checked">>,
) {
  return await db
    .update(shoppingListItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(shoppingListItems.id, itemId))
    .returning();
}

async function touchShoppingList(listId: string) {
  return await db
    .update(shoppingLists)
    .set({ updatedAt: new Date() })
    .where(eq(shoppingLists.id, listId))
    .returning();
}

async function removeShoppingListItem(itemId: string) {
  return await db
    .delete(shoppingListItems)
    .where(eq(shoppingListItems.id, itemId))
    .returning();
}

async function removeShoppingListItemsByIds(listId: string, itemIds: string[]) {
  if (itemIds.length === 0) {
    return [];
  }

  return await db
    .delete(shoppingListItems)
    .where(
      and(
        eq(shoppingListItems.shoppingListId, listId),
        inArray(shoppingListItems.id, itemIds),
      ),
    )
    .returning();
}

async function clearShoppingList(listId: string) {
  return await db
    .delete(shoppingListItems)
    .where(eq(shoppingListItems.shoppingListId, listId))
    .returning();
}

export const shoppingRepo = {
  getShoppingListByUser,
  getOrCreateShoppingList,
  getShoppingListItemById,
  getShoppingListItemByListAndProduct,
  saveShoppingListItem,
  updateShoppingListItem,
  touchShoppingList,
  removeShoppingListItem,
  removeShoppingListItemsByIds,
  clearShoppingList,
};
