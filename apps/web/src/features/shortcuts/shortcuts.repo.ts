import { db } from "@/lib/db";
import { products, shortcutProducts, shortcuts } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
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
    .orderBy(desc(shortcuts.createdAt));

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
    const [row] = await tx.insert(shortcuts).values(data).returning();
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

export const shortcutRepo = {
  setShowOnHome,
  getAll,
  getOne,
  save,
  update,
  softDelete,
};
