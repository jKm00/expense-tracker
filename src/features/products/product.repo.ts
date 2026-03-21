import { db } from "@/lib/db";
import type { Product } from "./product.models";
import { and, eq, ilike, notExists } from "drizzle-orm";
import { product, productTag, recurringProduct, tag } from "./product.schema";
import { productMappers } from "./product.mappers";

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

async function getAllRecurring(userId: string) {
  const recurring = await db
    .select({
      recurringProduct,
      product,
    })
    .from(recurringProduct)
    .innerJoin(product, eq(recurringProduct.productId, product.id))
    .where(eq(product.userId, userId));
  return recurring.map(productMappers.mapToRecurringWithProduct);
}

async function save(data: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  return (await db.insert(product).values(data).returning())[0];
}

async function update(
  id: string,
  data: Partial<Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  await db
    .update(product)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(product.id, id));
}

async function deleteProduct(id: string) {
  await db.delete(product).where(eq(product.id, id));
}

export const productRepo = {
  get,
  getByName,
  getAll,
  getUntaggedProducts,
  getAllRecurring,
  save,
  update,
  deleteProduct,
};
