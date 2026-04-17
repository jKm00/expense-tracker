import { db } from "@/lib/db";
import { products, productTags } from "./products.schema";
import { NewProduct, UpdateProduct } from "./products.models";
import { and, eq } from "drizzle-orm";

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

export const productRepo = {
  getAll,
  getOne,
  save,
  saveTagLink,
  update,
  remove,
  softDelete,
  removeTagLink,
};
