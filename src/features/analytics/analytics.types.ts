import type { Transaction } from "../transactions/transaction.models";
import type { Product } from "../products/product.models";
import type { Tag } from "../tags/tag.models";

/**
 * A transaction enriched with its product's tags.
 * Built client-side by joining TransactionWithProduct data with ProductWithTags data.
 */
export type EnrichedTransaction = {
  transaction: Transaction;
  product: Product | null;
  tags: Tag[];
};

/**
 * Computed summary metrics for a set of transactions.
 * All monetary values are numbers (parsed from the string `price` field).
 */
export type AnalyticsMetrics = {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  transactionCount: number;
  dailyAverage: number;
  biggestExpense: {
    amount: number;
    productName: string; // "Unknown product" when product is null
  } | null; // null when no expense transactions exist
};

/**
 * Delta between current and comparison period for a single metric.
 */
export type ComparisonDelta = {
  absolute: number; // current - comparison
  percentage: number; // ((current - comparison) / comparison) * 100, 0 when comparison is 0
  direction: "up" | "down" | "neutral";
  favorable: boolean; // context-dependent: expenses down = favorable, income up = favorable
};

export type ComparisonType = "nothing" | "month" | "year";

/**
 * One data point per day for the daily spending bar chart.
 * Days with no transactions still appear with expenses: 0, income: 0.
 */
export type DailyChartDataPoint = {
  day: number; // 1-based day of month
  expenses: number;
  income: number;
  comparisonExpenses?: number; // present when comparing
};

/**
 * One data point per tag for the spending-by-tag donut chart.
 * Includes an "Untagged" entry for transactions whose products have no tags.
 */
export type TagChartDataPoint = {
  tagId: string; // "untagged" for the untagged bucket
  tagName: string;
  tagColor: string; // CSS color value; "hsl(var(--muted-foreground))" for untagged
  amount: number;
  comparisonAmount?: number;
};

/**
 * One data point per product for the top-products horizontal bar chart.
 * Top 8 by current period expense. Comparison amounts use the SAME product set.
 */
export type ProductChartDataPoint = {
  productId: string;
  productName: string;
  amount: number;
  comparisonAmount?: number; // 0 if product had no transactions in comparison period
};
