import { db } from "@/lib/db";
import { products, shortcutProducts, shortcuts } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import {
  NewShortcut,
  Shortcut,
  ShortcutProduct,
  ShortcutWithProducts,
} from "./shortcuts.models";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

async function getOne(userId: string, shortcutId: string) {
  const [row] = await db
    .select()
    .from(shortcuts)
    .where(and(eq(shortcuts.id, shortcutId), eq(shortcuts.userId, userId)))
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
      .where(
        and(eq(shortcuts.userId, data.userId), isNull(shortcuts.deletedAt)),
      );
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
  userId: string,
  shortcutId: string,
  data: Partial<NewShortcut>,
  productIds: string[],
) {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(shortcuts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shortcuts.id, shortcutId), eq(shortcuts.userId, userId)))
      .returning();
    if (!row) {
      throw new Error(`Shortcut ${shortcutId} not found for user ${userId}`);
    }
    await tx
      .delete(shortcutProducts)
      .where(eq(shortcutProducts.shortcutId, shortcutId));
    await tx
      .insert(shortcutProducts)
      .values(productIds.map((productId) => ({ shortcutId, productId })));
    return row;
  });
}

async function softDelete(userId: string, shortcutId: string) {
  return await db
    .update(shortcuts)
    .set({ deletedAt: new Date() })
    .where(and(eq(shortcuts.id, shortcutId), eq(shortcuts.userId, userId)))
    .returning();
}

async function setShowOnHomeInTx(
  tx: Tx,
  userId: string,
  shortcutIds: string[],
) {
  const owned = and(eq(shortcuts.userId, userId), isNull(shortcuts.deletedAt));
  await tx.update(shortcuts).set({ showOnHome: false }).where(owned);
  if (shortcutIds.length > 0) {
    await tx
      .update(shortcuts)
      .set({ showOnHome: true })
      .where(and(owned, inArray(shortcuts.id, shortcutIds)));
  }
}

// Listed shortcuts come first, any others keep their relative order after them
async function reorderInTx(tx: Tx, userId: string, shortcutIds: string[]) {
  const rows = await tx
    .select({ id: shortcuts.id })
    .from(shortcuts)
    .where(and(eq(shortcuts.userId, userId), isNull(shortcuts.deletedAt)))
    .orderBy(asc(shortcuts.position), asc(shortcuts.createdAt));

  const listed = new Set(shortcutIds);
  const ordered = [
    ...shortcutIds,
    ...rows.map((row) => row.id).filter((id) => !listed.has(id)),
  ];

  const positions = sql.join(
    ordered.map((id, position) => sql`(${id}::uuid, ${position}::integer)`),
    sql`, `,
  );
  if (ordered.length > 0) {
    await tx.execute(
      sql`UPDATE shortcuts SET position = v.position FROM (VALUES ${positions}) AS v(id, position) WHERE shortcuts.id = v.id AND shortcuts.user_id = ${userId}`,
    );
  }
}

async function reorder(userId: string, shortcutIds: string[]) {
  await db.transaction((tx) => reorderInTx(tx, userId, shortcutIds));
}

export const shortcutRepo = {
  reorder,
  reorderInTx,
  setShowOnHomeInTx,
  getAll,
  getOne,
  save,
  update,
  softDelete,
};
