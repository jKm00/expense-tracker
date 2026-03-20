import { db } from "@/lib/db";
import { NewTransaction } from "./transaction.models";
import { transaction } from "./transaction.schema";
import { eq } from "drizzle-orm";
import { product } from "../products/product.schema";

async function getAll(userId: string) {
  return await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .leftJoin(product, eq(product.id, transaction.productId));
}

async function save(data: NewTransaction) {
  return (await db.insert(transaction).values(data).returning())[0];
}

export const transactionRepo = {
  getAll,
  save,
};
