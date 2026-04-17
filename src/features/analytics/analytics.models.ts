import type { ReactNode } from "react";
import type { Tag } from "@/features/tags/tags.models";

export type ComparisonDelta = {
  absolute: number; // current - comparison
  percentage: number; // ((current - comparison) / comparison) * 100, 0 when comparison is 0
  direction: "up" | "down" | "neutral";
  favorable: boolean; // context-dependent: expenses down = favorable, income up = favorable
};

/**
 * Return type of computeAnalyticsMetrics().
 * Single-pass computation over a list of transactions.
 */
export type AnalyticsMetrics = {
  netBalance: number;
  totalIncome: number;
  totalExpenses: number;
  fixedIncome: number;
  variableIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  largest: number;
  savingsRate: number;
  transactionCount: number;
  itemsPerTransaction: number;
  totalItems: number;
  avgItemValue: number;
  dailySpending: number;
  activeDays: number;
};

/** All pre-computed comparison deltas */
export type AllDeltas = {
  netBalance: ComparisonDelta;
  totalIncome: ComparisonDelta;
  totalExpenses: ComparisonDelta;
  savingsRate: ComparisonDelta;
  dailySpending: ComparisonDelta;
  largest: ComparisonDelta;
  activeDays: ComparisonDelta;
  fixedIncome: ComparisonDelta;
  variableIncome: ComparisonDelta;
  fixedExpenses: ComparisonDelta;
  variableExpenses: ComparisonDelta;
  avgTransaction: ComparisonDelta;
  transactionCount: ComparisonDelta;
  itemsPerTransaction: ComparisonDelta;
  avgItemValue: ComparisonDelta;
  totalItems: ComparisonDelta;
  avgTransactionValue: number;
};

/** Pre-computed daily expense entry for chart data */
export type DailyExpenseEntry = {
  day: number;
  value: number;
  comparison: number;
};

/** Props for HeroKpis component */
export type HeroKpisProps = {
  metrics: AnalyticsMetrics;
  deltas: {
    netBalance: ComparisonDelta;
    totalIncome: ComparisonDelta;
    totalExpenses: ComparisonDelta;
  };
};

/** Props for QuickStats component */
export type QuickStatsProps = {
  metrics: AnalyticsMetrics;
  deltas: {
    savingsRate: ComparisonDelta;
    dailySpending: ComparisonDelta;
    largest: ComparisonDelta;
    activeDays: ComparisonDelta;
  };
};

/** Props for DetailedKpis component */
export type DetailedKpisProps = {
  metrics: AnalyticsMetrics;
  avgTransaction: number;
  deltas: {
    fixedIncome: ComparisonDelta;
    variableIncome: ComparisonDelta;
    fixedExpenses: ComparisonDelta;
    variableExpenses: ComparisonDelta;
    avgTransaction: ComparisonDelta;
    transactionCount: ComparisonDelta;
    itemsPerTransaction: ComparisonDelta;
    avgItemValue: ComparisonDelta;
    totalItems: ComparisonDelta;
  };
};

/** Props for SpentGraph component */
export type SpentGraphProps = {
  chartData: DailyExpenseEntry[];
  hasTransactions: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

/** Pre-computed cumulative expense entry for cumulative chart */
export type CumulativeExpenseEntry = {
  day: number;
  cumulative: number;
  comparisonCumulative: number;
};

/** Props for CumulativeSpentGraph component */
export type CumulativeSpentGraphProps = {
  chartData: CumulativeExpenseEntry[];
  hasTransactions: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

/** Props for the generic ExpensesBreakdownChart */
export type ExpensesBreakdownChartProps = {
  title: string;
  /** The dataKey name used in chart data objects, e.g. "tag" or "product" */
  categoryKey: string;
  /** Array of objects — each must have a [categoryKey] string field and a `total` number field */
  data: Array<Record<string, string | number>>;
  color: string;
  /** Label shown in expand button, e.g. "tags" or "products" */
  itemLabel: string;
  /** Description text (dynamic, e.g. "Top 5 tags by spending") */
  description: string;
  /** Width of the Y-axis labels */
  yAxisWidth?: number;
};

/** Props for ChartCardSkeleton */
export type ChartCardSkeletonProps = {
  className?: string;
};

/** Props for AnalyticsFilterSheet */
export type AnalyticsFilterSheetProps = {
  children: ReactNode;
  includeTags: Tag[];
  excludeTags: Tag[];
  onIncludeTagsChange: (tags: Tag[]) => void;
  onExcludeTagsChange: (tags: Tag[]) => void;
};

/** Props for AnalyticsFilterTrigger */
export type AnalyticsFilterTriggerProps = {
  activeFilterCount: number;
};

/** Props for AnalyticsDataLoader — passed from RouteComponent */
export type AnalyticsDataLoaderProps = {
  includeTags: Tag[];
  excludeTags: Tag[];
  month: number | undefined;
  year: number | undefined;
  comparison: "year" | "month" | undefined;
};
