import { db } from "@/lib/db";
import { recurring } from "@/lib/db/schema";
import { products } from "@/features/products/products.schema";
import { NewRecurring, RecurringWithProduct, UpdateRecurring } from "./recurring.models";
import { and, eq, isNull } from "drizzle-orm";

async function getAll(userId: string): Promise<RecurringWithProduct[]> {
  const rows = await db
    .select()
    .from(recurring)
    .innerJoin(products, eq(recurring.productId, products.id))
    .where(and(eq(products.userId, userId), isNull(recurring.deletedAt)));

  return rows.map((row) => ({
    ...row.recurring,
    products: row.products,
  }));
}

async function getOne(id: string) {
  return await db.query.recurring.findFirst({
    with: {
      products: true,
    },
    where: {
      id,
    },
  });
}

async function save(data: NewRecurring) {
  return await db.insert(recurring).values(data).returning();
}

async function update(id: string, data: UpdateRecurring) {
  return await db
    .update(recurring)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recurring.id, id))
    .returning();
}

async function softDelete(id: string) {
  return await db
    .update(recurring)
    .set({ deletedAt: new Date() })
    .where(eq(recurring.id, id))
    .returning();
}

export const recurringRepo = {
  getAll,
  getOne,
  save,
  update,
  softDelete,
};
