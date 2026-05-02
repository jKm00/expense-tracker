import { db } from "@/lib/db";
import { products, productTags } from "./products.schema";
import { entries, transactions } from "../transactions/transactions.schema";
import { NewProduct, UpdateProduct } from "./products.models";
import { and, count, eq, sql, sum } from "drizzle-orm";

async function getAll(userId: string) {
  return await db.query.products.findMany({
    with: {
      tags: true,
    },
    where: {
      userId,
      deletedAt: { isNull: true },
    },
  });
}

async function getOne(id: string) {
  return await db.query.products.findFirst({
    with: {
      tags: true,
    },
    where: {
      id,
    },
  });
}

async function save(product: NewProduct) {
  return await db.insert(products).values(product).returning();
}

async function update(id: string, data: UpdateProduct) {
  return await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning();
}

async function remove(id: string) {
  return await db.delete(products).where(eq(products.id, id)).returning();
}

async function softDelete(id: string) {
  return await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
}

async function saveTagLink(productId: string, tagId: string) {
  return await db
    .insert(productTags)
    .values({
      productId,
      tagId,
    })
    .returning();
}

async function removeTagLink(productId: string, tagId: string) {
  return await db
    .delete(productTags)
    .where(
      and(eq(productTags.productId, productId), eq(productTags.tagId, tagId)),
    )
    .returning();
}

async function getStats(productId: string) {
  const [stats] = await db
    .select({
      purchaseCount: count(entries.id),
      totalQuantity: sql<number>`coalesce(${sum(entries.quantity)}, 0)`,
      totalSpent: sql<string>`coalesce(sum(case when ${entries.type} = 'expense' then ${entries.price} * ${entries.quantity} else 0 end), 0)`,
      totalIncome: sql<string>`coalesce(sum(case when ${entries.type} = 'income' then ${entries.price} * ${entries.quantity} else 0 end), 0)`,
      lastPurchasedAt: sql<Date | null>`max(${transactions.date})`,
    })
    .from(entries)
    .innerJoin(transactions, eq(entries.transactionId, transactions.id))
    .where(eq(entries.productId, productId));

  return {
    purchaseCount: Number(stats?.purchaseCount ?? 0),
    totalQuantity: Number(stats?.totalQuantity ?? 0),
    totalSpent: String(stats?.totalSpent ?? "0"),
    totalIncome: String(stats?.totalIncome ?? "0"),
    lastPurchasedAt: stats?.lastPurchasedAt ?? null,
  };
}

export const productRepo = {
  getAll,
  getOne,
  getStats,
  save,
  saveTagLink,
  update,
  remove,
  softDelete,
  removeTagLink,
};
