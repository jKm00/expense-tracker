import { db } from "@/lib/db";
import { NewTransaction, UpdateTransaction } from "./transaction.models";
import { transaction } from "./transaction.schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { product } from "../products/product.schema";

async function getAll(userId: string, start: Date, end: Date) {
  return await db
    .select()
    .from(transaction)
    .where(
      and(
        eq(transaction.userId, userId),
        gte(transaction.date, start),
        lt(transaction.date, end),
      ),
    )
    .leftJoin(product, eq(product.id, transaction.productId));
}

async function get(id: string) {
  const rows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.id, id))
    .leftJoin(product, eq(product.id, transaction.productId));
  return rows[0] ?? null;
}

async function save(data: NewTransaction) {
  return (await db.insert(transaction).values(data).returning())[0];
}

async function update(id: string, data: UpdateTransaction) {
  return (
    await db
      .update(transaction)
      .set(data)
      .where(eq(transaction.id, id))
      .returning()
  )[0];
}

async function remove(id: string) {
  return (
    await db.delete(transaction).where(eq(transaction.id, id)).returning()
  )[0];
}

export const transactionRepo = {
  getAll,
  get,
  save,
  update,
  remove,
};
