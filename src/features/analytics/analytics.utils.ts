import dayjs from "dayjs";
import type { ProductWithTags } from "../products/product.models";
import type { TransactionWithProduct } from "../transactions/transaction.models";
import type {
  AnalyticsMetrics,
  ComparisonDelta,
  DailyChartDataPoint,
  EnrichedTransaction,
  ProductChartDataPoint,
  TagChartDataPoint,
} from "./analytics.types";

/**
 * Enrich transactions with tag data by looking up each transaction's product
 * in the ProductWithTags array and copying over its tags.
 */
export function enrichTransactionsWithTags(
  transactions: TransactionWithProduct[],
  products: ProductWithTags[],
): EnrichedTransaction[] {
  const productTagMap = new Map<string, ProductWithTags>();
  for (const p of products) {
    productTagMap.set(p.id, p);
  }

  return transactions.map((t) => ({
    transaction: t.transaction,
    product: t.product,
    tags: productTagMap.get(t.transaction.productId)?.tags ?? [],
  }));
}

/**
 * Filter transactions by include/exclude tag lists.
 *
 * Rules:
 * 1. If both lists are empty → return all transactions.
 * 2. If includeTags is non-empty → keep only transactions whose product has ANY include tag.
 *    Untagged transactions (no tags) are EXCLUDED.
 * 3. If excludeTags is non-empty → remove transactions whose product has ANY exclude tag.
 *    Untagged transactions are NOT excluded.
 * 4. Exclude wins: if same tag in both lists, transactions with that tag are excluded.
 * 5. Exclude is applied AFTER include.
 */
export function filterByTags(
  transactions: EnrichedTransaction[],
  includeTags: string[],
  excludeTags: string[],
): EnrichedTransaction[] {
  let result = transactions;

  if (includeTags.length > 0) {
    const includeSet = new Set(includeTags);
    result = result.filter((t) =>
      t.tags.some((tag) => includeSet.has(tag.id)),
    );
  }

  if (excludeTags.length > 0) {
    const excludeSet = new Set(excludeTags);
    result = result.filter(
      (t) => !t.tags.some((tag) => excludeSet.has(tag.id)),
    );
  }

  return result;
}

/**
 * Compute summary metrics from a list of enriched transactions.
 * Transaction.price is a string (numeric DB column) — we parseFloat it.
 */
export function computeMetrics(
  transactions: EnrichedTransaction[],
  daysInMonth: number,
): AnalyticsMetrics {
  let totalExpenses = 0;
  let totalIncome = 0;
  let biggestExpenseAmount = 0;
  let biggestExpenseProduct: string | null = null;

  for (const { transaction, product } of transactions) {
    const price = parseFloat(transaction.price);
    if (transaction.type === "expense") {
      totalExpenses += price;
      if (price > biggestExpenseAmount) {
        biggestExpenseAmount = price;
        biggestExpenseProduct = product?.name ?? "Unknown product";
      }
    } else {
      totalIncome += price;
    }
  }

  return {
    totalExpenses,
    totalIncome,
    netBalance: totalIncome - totalExpenses,
    transactionCount: transactions.length,
    dailyAverage: daysInMonth > 0 ? totalExpenses / daysInMonth : 0,
    biggestExpense:
      biggestExpenseProduct !== null
        ? { amount: biggestExpenseAmount, productName: biggestExpenseProduct }
        : null,
  };
}

/**
 * Compute the delta between a current value and a comparison value.
 * @param invertFavorable - When true, "down" is favorable (used for expenses).
 */
export function computeDelta(
  current: number,
  comparison: number,
  invertFavorable?: boolean,
): ComparisonDelta {
  const absolute = current - comparison;
  const percentage = comparison !== 0 ? (absolute / comparison) * 100 : 0;
  const direction: ComparisonDelta["direction"] =
    absolute > 0 ? "up" : absolute < 0 ? "down" : "neutral";

  let favorable: boolean;
  if (direction === "neutral") {
    favorable = true;
  } else if (invertFavorable) {
    favorable = direction === "down";
  } else {
    favorable = direction === "up";
  }

  return { absolute, percentage, direction, favorable };
}

/**
 * Group transactions by day of month for the daily spending chart.
 * Returns one entry per day (1..daysInMonth), each with expenses and income sums.
 * Uses dayjs local time for day extraction.
 *
 * @param year - Full year (e.g., 2026)
 * @param month - 0-indexed month (0 = January)
 */
export function groupByDay(
  transactions: EnrichedTransaction[],
  year: number,
  month: number,
): DailyChartDataPoint[] {
  const daysInMonth = dayjs().year(year).month(month).daysInMonth();

  const days: DailyChartDataPoint[] = Array.from(
    { length: daysInMonth },
    (_, i) => ({
      day: i + 1,
      expenses: 0,
      income: 0,
    }),
  );

  for (const { transaction } of transactions) {
    const day = dayjs(transaction.date).date();
    const price = parseFloat(transaction.price);
    const entry = days[day - 1];
    if (!entry) continue;

    if (transaction.type === "expense") {
      entry.expenses += price;
    } else {
      entry.income += price;
    }
  }

  return days;
}

/**
 * Group expense transactions by tag for the donut chart.
 * Multi-tag transactions are counted under EACH tag.
 * Transactions with no tags go into an "Untagged" bucket.
 * Income transactions are excluded.
 */
export function groupByTag(
  transactions: EnrichedTransaction[],
): TagChartDataPoint[] {
  const tagMap = new Map<
    string,
    { tagName: string; tagColor: string; amount: number }
  >();

  for (const { transaction, tags } of transactions) {
    if (transaction.type !== "expense") continue;

    const price = parseFloat(transaction.price);

    if (tags.length === 0) {
      const existing = tagMap.get("untagged");
      if (existing) {
        existing.amount += price;
      } else {
        tagMap.set("untagged", {
          tagName: "Untagged",
          tagColor: "hsl(var(--muted-foreground))",
          amount: price,
        });
      }
    } else {
      for (const tag of tags) {
        const existing = tagMap.get(tag.id);
        if (existing) {
          existing.amount += price;
        } else {
          tagMap.set(tag.id, {
            tagName: tag.name,
            tagColor: tag.color ?? "hsl(var(--muted-foreground))",
            amount: price,
          });
        }
      }
    }
  }

  return Array.from(tagMap.entries()).map(([tagId, data]) => ({
    tagId,
    ...data,
  }));
}

/**
 * Get top N products by expense amount in the current period.
 * When comparison transactions are provided, compute comparison amounts
 * for the SAME set of products (not the comparison period's top N).
 */
export function getTopProducts(
  transactions: EnrichedTransaction[],
  comparisonTransactions: EnrichedTransaction[] | null,
  limit: number,
): ProductChartDataPoint[] {
  const productMap = new Map<
    string,
    { productName: string; amount: number }
  >();

  for (const { transaction, product } of transactions) {
    if (transaction.type !== "expense") continue;

    const price = parseFloat(transaction.price);
    const productId = product?.id ?? "unknown";
    const existing = productMap.get(productId);
    if (existing) {
      existing.amount += price;
    } else {
      productMap.set(productId, {
        productName: product?.name ?? "Unknown product",
        amount: price,
      });
    }
  }

  const sorted = Array.from(productMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit);

  if (!comparisonTransactions) {
    return sorted.map(([productId, data]) => ({
      productId,
      productName: data.productName,
      amount: data.amount,
    }));
  }

  const comparisonMap = new Map<string, number>();
  for (const { transaction, product } of comparisonTransactions) {
    if (transaction.type !== "expense") continue;

    const price = parseFloat(transaction.price);
    const productId = product?.id ?? "unknown";
    comparisonMap.set(productId, (comparisonMap.get(productId) ?? 0) + price);
  }

  return sorted.map(([productId, data]) => ({
    productId,
    productName: data.productName,
    amount: data.amount,
    comparisonAmount: comparisonMap.get(productId) ?? 0,
  }));
}
