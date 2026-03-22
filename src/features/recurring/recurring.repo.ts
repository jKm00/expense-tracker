import { db } from "@/lib/db";
import type {
  NewRecurringProduct,
  UpdateRecurringProduct,
} from "./recurring.models";
import { eq } from "drizzle-orm";
import { recurringProduct } from "./recurring.schema";
import { product } from "../products/product.schema";
import { recurringMappers } from "./recurring.mappers";

async function getAll(userId: string) {
  const recurring = await db
    .select({
      recurringProduct,
      product,
    })
    .from(recurringProduct)
    .innerJoin(product, eq(recurringProduct.productId, product.id))
    .where(eq(product.userId, userId));
  return recurring.map(recurringMappers.mapToRecurringWithProduct);
}

async function get(id: string) {
  const recurring = await db
    .select({
      recurringProduct,
      product,
    })
    .from(recurringProduct)
    .innerJoin(product, eq(recurringProduct.productId, product.id))
    .where(eq(recurringProduct.id, id));
  return recurringMappers.mapToRecurringWithProduct(recurring[0]);
}

async function save(data: NewRecurringProduct) {
  return (await db.insert(recurringProduct).values(data).returning())[0];
}

async function update(id: string, data: UpdateRecurringProduct) {
  return (
    await db
      .update(recurringProduct)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(recurringProduct.id, id))
      .returning()
  )[0];
}

export const recurringRepo = {
  getAll,
  get,
  save,
  update,
};
