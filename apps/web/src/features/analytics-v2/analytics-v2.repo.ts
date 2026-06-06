import { products } from "@/features/products/products.schema";
import { tags } from "@/features/tags/tags.schema";
import {
  entries,
  entryTags,
  transactions,
} from "@/features/transactions/transactions.schema";
import { db } from "@/lib/db";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  type AnalyticsV2EntryRow,
  type AnalyticsV2PeriodRange,
} from "./analytics-v2.models";

async function getEntryRows(
  userId: string,
  period: AnalyticsV2PeriodRange,
): Promise<AnalyticsV2EntryRow[]> {
  return await db
    .select({
      id: entries.id,
      transactionId: transactions.id,
      price: entries.price,
      quantity: entries.quantity,
      type: entries.type,
      date: transactions.date,
      store: transactions.store,
      description: transactions.description,
      source: transactions.source,
      needsReview: transactions.needsReview,
      productId: products.id,
      productName: products.name,
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
    })
    .from(entries)
    .innerJoin(transactions, eq(entries.transactionId, transactions.id))
    .innerJoin(products, eq(entries.productId, products.id))
    .leftJoin(entryTags, eq(entries.id, entryTags.entryId))
    .leftJoin(tags, eq(entryTags.tagId, tags.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, period.startDate),
        lte(transactions.date, period.endDate),
      ),
    )
    .orderBy(asc(transactions.date));
}

export const analyticsV2Repo = {
  getEntryRows,
};
