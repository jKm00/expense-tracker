import { and, eq, lte, gte, or, isNull } from "drizzle-orm";
import type { Database } from "./db/index.js";
import { recurring } from "./db/schemas/recurring.schema.js";
import { products } from "./db/schemas/products.schema.js";
import { transactions, entries } from "./db/schemas/transactions.schema.js";
import {
  startOfDay,
  getDay,
  getDate,
  getMonth,
} from "date-fns";

interface ProcessResult {
  created: number;
  skipped: number;
}

/**
 * Determines if a recurring transaction should fire on the given date
 * based on its interval and start date.
 *
 * - weekly:  fires on the same day-of-week as `start`
 * - monthly: fires on the same day-of-month as `start`
 *            (if start is 31st and month has 30 days, fires on 30th)
 * - yearly:  fires on the same month AND day-of-month as `start`
 */
export function shouldFireOnDate(
  interval: "weekly" | "monthly" | "yearly",
  start: Date,
  today: Date,
): boolean {
  switch (interval) {
    case "weekly":
      return getDay(today) === getDay(start);

    case "monthly": {
      const startDay = getDate(start);
      const todayDay = getDate(today);
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      if (startDay > lastDayOfMonth) {
        return todayDay === lastDayOfMonth;
      }
      return todayDay === startDay;
    }

    case "yearly":
      return (
        getMonth(today) === getMonth(start) &&
        getDate(today) === getDate(start)
      );
  }
}

/**
 * Fetches all active recurring transactions that are eligible to fire today,
 * then creates a transaction + entry for each one.
 */
export async function processRecurringTransactions(
  db: Database,
  today: Date,
): Promise<ProcessResult> {
  const todayStart = startOfDay(today);

  const activeRecurring = await db
    .select({
      recurring: recurring,
      userId: products.userId,
      productName: products.name,
    })
    .from(recurring)
    .innerJoin(products, eq(recurring.productId, products.id))
    .where(
      and(
        eq(recurring.isActive, true),
        lte(recurring.start, todayStart),
        or(isNull(recurring.end), gte(recurring.end!, todayStart)),
      ),
    );

  let created = 0;
  let skipped = 0;

  for (const row of activeRecurring) {
    const rec = row.recurring;

    if (!shouldFireOnDate(rec.interval, rec.start, todayStart)) {
      skipped++;
      continue;
    }

    // Idempotency check: skip if transaction already exists for this recurring entry today
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .innerJoin(entries, eq(entries.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.source, "recurring"),
          eq(transactions.userId, row.userId),
          eq(transactions.date, todayStart),
          eq(entries.productId, rec.productId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      console.log(
        `[recurring-job] Skipped duplicate for "${row.productName}" (productId=${rec.productId}) for user ${row.userId}`,
      );
      continue;
    }

    const signedPrice =
      rec.type === "expense"
        ? String(-Math.abs(Number(rec.price)))
        : String(Math.abs(Number(rec.price)));
    const unsignedPrice = String(Math.abs(Number(rec.price)));

    await db.transaction(async (tx) => {
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          userId: row.userId,
          source: "recurring",
          description: `Recurring: ${row.productName}`,
          totalPrice: signedPrice,
          date: todayStart,
        })
        .returning({ id: transactions.id });

      await tx.insert(entries).values({
        transactionId: newTransaction.id,
        productId: rec.productId,
        price: unsignedPrice,
        quantity: 1,
        type: rec.type,
      });
    });

    created++;
    console.log(
      `[recurring-job] Created transaction for recurring "${row.productName}" (${rec.interval}, ${rec.type}, $${rec.price}) for user ${row.userId}`,
    );
  }

  return { created, skipped };
}
