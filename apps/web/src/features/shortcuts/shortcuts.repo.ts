import { db } from "@/lib/db";
import { products, shortcutProducts, shortcuts } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import {
  NewShortcut,
  Shortcut,
  ShortcutProduct,
  ShortcutWithProducts,
} from "./shortcuts.models";

async function attachProducts(
  rows: Shortcut[],
): Promise<ShortcutWithProducts[]> {
  if (rows.length === 0) {
    return [];
  }

  const productRows = await db
    .select({
      shortcutId: shortcutProducts.shortcutId,
      id: products.id,
      name: products.name,
    })
    .from(shortcutProducts)
    .innerJoin(products, eq(shortcutProducts.productId, products.id))
    .where(
      and(
        inArray(
          shortcutProducts.shortcutId,
          rows.map((row) => row.id),
        ),
        isNull(products.deletedAt),
      ),
    );

  const byShortcut = new Map<string, ShortcutProduct[]>();
  for (const { shortcutId, id, name } of productRows) {
    byShortcut.set(shortcutId, [
      ...(byShortcut.get(shortcutId) ?? []),
      { id, name },
    ]);
  }

  return rows.map((row) => ({
    ...row,
    products: (byShortcut.get(row.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));
}

async function getAll(userId: string) {
  const rows = await db
    .select()
    .from(shortcuts)
    .where(and(eq(shortcuts.userId, userId), isNull(shortcuts.deletedAt)))
    .orderBy(asc(shortcuts.position), asc(shortcuts.createdAt));

  return await attachProducts(rows);
}

async function getOne(shortcutId: string) {
  const [row] = await db
    .select()
    .from(shortcuts)
    .where(eq(shortcuts.id, shortcutId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [withProducts] = await attachProducts([row]);
  return withProducts;
}

async function save(data: NewShortcut, productIds: string[]) {
  return await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ value: max(shortcuts.position) })
      .from(shortcuts)
      .where(eq(shortcuts.userId, data.userId));
    const [row] = await tx
      .insert(shortcuts)
      .values({ ...data, position: (last?.value ?? -1) + 1 })
      .returning();
    await tx
      .insert(shortcutProducts)
      .values(productIds.map((productId) => ({ shortcutId: row.id, productId })));
    return row;
  });
}

async function update(
  shortcutId: string,
  data: Partial<NewShortcut>,
  productIds: string[],
) {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shortcuts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shortcuts.id, shortcutId))
      .returning();
    await tx
      .delete(shortcutProducts)
      .where(eq(shortcutProducts.shortcutId, shortcutId));
    await tx
      .insert(shortcutProducts)
      .values(productIds.map((productId) => ({ shortcutId, productId })));
    return row;
  });
}

async function softDelete(shortcutId: string) {
  return await db
    .update(shortcuts)
    .set({ deletedAt: new Date() })
    .where(eq(shortcuts.id, shortcutId))
    .returning();
}

async function setShowOnHome(userId: string, shortcutIds: string[]) {
  await db.transaction(async (tx) => {
    const owned = and(eq(shortcuts.userId, userId), isNull(shortcuts.deletedAt));
    await tx.update(shortcuts).set({ showOnHome: false }).where(owned);
    if (shortcutIds.length > 0) {
      await tx
        .update(shortcuts)
        .set({ showOnHome: true })
        .where(and(owned, inArray(shortcuts.id, shortcutIds)));
    }
  });
}

async function reorder(userId: string, shortcutIds: string[]) {
  await db.transaction(async (tx) => {
    for (const [position, id] of shortcutIds.entries()) {
      await tx
        .update(shortcuts)
        .set({ position })
        .where(and(eq(shortcuts.id, id), eq(shortcuts.userId, userId)));
    }
  });
}

export const shortcutRepo = {
  reorder,
  setShowOnHome,
  getAll,
  getOne,
  save,
  update,
  softDelete,
};
