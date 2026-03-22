import { db } from "@/lib/db";
import type { Product } from "./product.models";
import { and, count, eq, ilike, notExists } from "drizzle-orm";
import { product } from "./product.schema";
import { productTag, tag } from "../tags/tag.schema";
import { productMappers } from "./product.mappers";
import { transaction } from "../transactions/transaction.schema";
import { recurringProduct } from "../recurring/recurring.schema";

async function get(id: string) {
  return await db.query.product.findFirst({
    with: {
      tags: true,
    },
    where: {
      id,
    },
  });
}

async function getByName(userId: string, name: string) {
  const res = await db
    .select()
    .from(product)
    .where(and(eq(product.userId, userId), ilike(product.name, name)));

  if (res.length === 0) return undefined;

  return res[0];
}

async function getAll(userId: string) {
  const products = await db
    .select({
      product,
      tag,
    })
    .from(product)
    .leftJoin(productTag, eq(product.id, productTag.productId))
    .leftJoin(tag, eq(productTag.tagId, tag.id))
    .where(eq(product.userId, userId));
  return productMappers.mapToProductsWithTags(products);
}

async function getUntaggedProducts(userId: string) {
  const products = await db
    .select({
      product,
      tag,
    })
    .from(product)
    .leftJoin(productTag, eq(product.id, productTag.productId))
    .leftJoin(tag, eq(productTag.tagId, tag.id))
    .where(
      and(
        eq(product.userId, userId),
        notExists(
          db
            .select()
            .from(productTag)
            .where(eq(productTag.productId, product.id)),
        ),
      ),
    );
  return productMappers.mapToProductsWithTags(products);
}

async function save(data: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  return (await db.insert(product).values(data).returning())[0];
}

async function update(
  id: string,
  data: Partial<Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  return (
    await db
      .update(product)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(product.id, id))
      .returning()
  )[0];
}

async function deleteProduct(id: string) {
  return (
    await db.delete(product).where(eq(product.id, id)).returning()
  )[0];
}

async function getUsage(productId: string) {
  const transactionCount = await db
    .select({ count: count() })
    .from(transaction)
    .where(eq(transaction.productId, productId))
    .then((r) => Number(r[0].count));

  const hasRecurring = await db
    .select({ id: recurringProduct.id })
    .from(recurringProduct)
    .where(eq(recurringProduct.productId, productId))
    .then((r) => r.length > 0);

  return { transactionCount, hasRecurring };
}

export const productRepo = {
  get,
  getByName,
  getAll,
  getUntaggedProducts,
  save,
  update,
  deleteProduct,
  getUsage,
};
