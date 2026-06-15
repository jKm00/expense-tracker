import { db } from "@/lib/db";
import { entries, recurring, transactions } from "@/lib/db/schema";
import { products } from "@/features/products/server/products.schema";
import { NewRecurring, RecurringWithProduct, UpdateRecurring } from "@/features/recurring/shared/recurring.models";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

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

async function getActiveRecurringForDate(date: Date) {
  return await db
    .select({
      recurring,
      userId: products.userId,
      productName: products.name,
    })
    .from(recurring)
    .innerJoin(products, eq(recurring.productId, products.id))
    .where(
      and(
        eq(recurring.isActive, true),
        isNull(recurring.deletedAt),
        lte(recurring.start, date),
        or(isNull(recurring.end), gte(recurring.end, date)),
      ),
    );
}

async function hasTransactionForDate({
  userId,
  productId,
  date,
}: {
  userId: string;
  productId: string;
  date: Date;
}) {
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(entries, eq(entries.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.source, "recurring"),
        eq(transactions.userId, userId),
        eq(transactions.date, date),
        eq(entries.productId, productId),
      ),
    )
    .limit(1);

  return existing.length > 0;
}

export const recurringRepo = {
  getAll,
  getOne,
  save,
  update,
  softDelete,
  getActiveRecurringForDate,
  hasTransactionForDate,
};
