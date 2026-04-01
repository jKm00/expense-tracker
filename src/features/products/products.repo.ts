import { db } from "@/lib/db";
import { products } from "./products.schema";
import { NewProduct, UpdateProduct } from "./products.models";
import { eq } from "drizzle-orm";

async function getAll(userId: string) {
  return await db.query.products.findMany({
    with: {
      tags: true,
    },
    where: {
      userId,
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

export const productRepo = {
  getAll,
  getOne,
  save,
  update,
  remove,
};
