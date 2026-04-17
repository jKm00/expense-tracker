// src/features/analytics/analytics.calculations.ts
import dayjs from "dayjs";
import type { FullTransaction } from "@/features/transactions/transactions.models";
import type { AnalyticsMetrics, AllDeltas, DailyExpenseEntry, CumulativeExpenseEntry } from "./analytics.models";
import { calculateComparisonDelta } from "./analytics.utils";

/**
 * Single-pass computation of all analytics metrics from a list of transactions.
 * Pure function — no hooks, no side effects.
 *
 * ⚠️ Uses `Number(entry.price) * entry.quantity` for all amounts.
 */
export function computeAnalyticsMetrics(
  transactions: FullTransaction[],
): AnalyticsMetrics {
  let netBalance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let fixedIncome = 0;
  let variableIncome = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;
  let largest = 0;
  let totalItems = 0;
  let totalItemValue = 0;
  const activeDays = new Set<number>();

  transactions.forEach((transaction) => {
    const day = dayjs(transaction.date).date();
    activeDays.add(day);

    const isRecurring = transaction.source === "recurring";

    transaction.entries.forEach((entry) => {
      const price = Number(entry.price) * entry.quantity;
      totalItems += entry.quantity;
      totalItemValue += Number(entry.price) * entry.quantity;

      if (entry.type === "expense") {
        netBalance -= price;
        totalExpenses += price;

        if (isRecurring) {
          fixedExpenses += price;
        } else {
          variableExpenses += price;
        }

        if (price > largest) {
          largest = price;
        }
      } else {
        netBalance += price;
        totalIncome += price;

        if (isRecurring) {
          fixedIncome += price;
        } else {
          variableIncome += price;
        }
      }
    });
  });

  const savingsRate =
    totalIncome === 0
      ? 0
      : ((totalIncome - totalExpenses) / totalIncome) * 100;
  const avgItemValue = totalItems === 0 ? 0 : totalItemValue / totalItems;
  const itemsPerTransaction =
    transactions.length === 0 ? 0 : totalItems / transactions.length;
  const dailySpending =
    activeDays.size === 0 ? 0 : totalExpenses / activeDays.size;

  return {
    netBalance,
    totalIncome,
    totalExpenses,
    fixedIncome,
    variableIncome,
    fixedExpenses,
    variableExpenses,
    largest,
    savingsRate,
    transactionCount: transactions.length,
    itemsPerTransaction,
    totalItems,
    avgItemValue,
    dailySpending,
    activeDays: activeDays.size,
  };
}

/**
 * Compute all 16 comparison deltas + avgTransaction value in one pass.
 * Pure function.
 */
export function computeAllDeltas(
  metrics: AnalyticsMetrics,
  comparisonMetrics: AnalyticsMetrics,
  transactionCount: number,
  comparisonTransactionCount: number,
): AllDeltas {
  const avgTransaction =
    transactionCount === 0
      ? 0
      : metrics.totalExpenses / transactionCount;
  const comparisonAvgTransaction =
    comparisonTransactionCount === 0
      ? 0
      : comparisonMetrics.totalExpenses / comparisonTransactionCount;

  return {
    netBalance: calculateComparisonDelta(metrics.netBalance, comparisonMetrics.netBalance, "up"),
    totalIncome: calculateComparisonDelta(metrics.totalIncome, comparisonMetrics.totalIncome, "up"),
    totalExpenses: calculateComparisonDelta(metrics.totalExpenses, comparisonMetrics.totalExpenses, "down"),
    savingsRate: calculateComparisonDelta(metrics.savingsRate, comparisonMetrics.savingsRate, "up"),
    dailySpending: calculateComparisonDelta(metrics.dailySpending, comparisonMetrics.dailySpending, "down"),
    largest: calculateComparisonDelta(metrics.largest, comparisonMetrics.largest, "down"),
    activeDays: calculateComparisonDelta(metrics.activeDays, comparisonMetrics.activeDays, "up"),
    fixedIncome: calculateComparisonDelta(metrics.fixedIncome, comparisonMetrics.fixedIncome, "up"),
    variableIncome: calculateComparisonDelta(metrics.variableIncome, comparisonMetrics.variableIncome, "up"),
    fixedExpenses: calculateComparisonDelta(metrics.fixedExpenses, comparisonMetrics.fixedExpenses, "down"),
    variableExpenses: calculateComparisonDelta(metrics.variableExpenses, comparisonMetrics.variableExpenses, "down"),
    avgTransaction: calculateComparisonDelta(avgTransaction, comparisonAvgTransaction, "down"),
    transactionCount: calculateComparisonDelta(metrics.transactionCount, comparisonMetrics.transactionCount, "down"),
    itemsPerTransaction: calculateComparisonDelta(metrics.itemsPerTransaction, comparisonMetrics.itemsPerTransaction, "up"),
    avgItemValue: calculateComparisonDelta(metrics.avgItemValue, comparisonMetrics.avgItemValue, "down"),
    totalItems: calculateComparisonDelta(metrics.totalItems, comparisonMetrics.totalItems, "down"),
    avgTransactionValue: avgTransaction,
  };
}

/**
 * Compute daily expense chart data from transactions.
 * Pure function.
 *
 * ⚠️ Uses `Number(curr.price)` WITHOUT quantity multiplication — intentional,
 * charts show per-unit price sums. Do NOT "fix" to multiply by quantity.
 */
export function computeDailyChartData(
  transactions: FullTransaction[],
  comparisonTransactions: FullTransaction[],
  month: number,
  year: number,
): DailyExpenseEntry[] {
  if (transactions.length === 0 && comparisonTransactions.length === 0)
    return [];

  const today = dayjs();
  const isCurrentMonth = today.month() === month && today.year() === year;
  const daysInMonth = isCurrentMonth
    ? today.date()
    : dayjs(new Date(year, month, 1)).daysInMonth();

  const dailyExpenses = new Map<number, number>();
  const comparisonDailyExpenses = new Map<number, number>();
  for (let i = 1; i <= daysInMonth; i++) {
    dailyExpenses.set(i, 0);
    comparisonDailyExpenses.set(i, 0);
  }

  transactions.forEach((transaction) => {
    const day = dayjs(transaction.date).date();
    const expenseSum = transaction.entries
      .filter((e) => e.type === "expense")
      .reduce((acc, curr) => acc + Number(curr.price), 0);
    dailyExpenses.set(day, (dailyExpenses.get(day) || 0) + expenseSum);
  });

  comparisonTransactions.forEach((transaction) => {
    const day = dayjs(transaction.date).date();
    const expenseSum = transaction.entries
      .filter((e) => e.type === "expense")
      .reduce((acc, curr) => acc + Number(curr.price), 0);
    comparisonDailyExpenses.set(
      day,
      (comparisonDailyExpenses.get(day) || 0) + expenseSum,
    );
  });

  return Array.from(dailyExpenses, ([day, value]) => ({
    day,
    value,
    comparison: comparisonDailyExpenses.get(day) || 0,
  }));
}

/**
 * Derive cumulative chart data from daily chart data.
 * Pure function — running sum over the daily entries.
 */
export function computeCumulativeChartData(
  dailyData: DailyExpenseEntry[],
): CumulativeExpenseEntry[] {
  if (dailyData.length === 0) return [];

  let cumulative = 0;
  let comparisonCumulative = 0;
  return dailyData.map((entry) => {
    cumulative += entry.value;
    comparisonCumulative += entry.comparison;
    return {
      day: entry.day,
      cumulative,
      comparisonCumulative,
    };
  });
}

/**
 * Compute tag breakdown data for the breakdown chart.
 * Pure function. Uses `Number(entry.price) * entry.quantity`.
 */
export function computeTagBreakdownData(
  transactions: FullTransaction[],
): Array<Record<string, string | number>> {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    transaction.entries.forEach((entry) => {
      if (entry.type !== "expense") return;
      const amount = Number(entry.price) * entry.quantity;
      const tags = entry.products?.tags ?? [];

      if (tags.length === 0) {
        totals.set("Untagged", (totals.get("Untagged") ?? 0) + amount);
      } else {
        tags.forEach((tag) => {
          totals.set(tag.name, (totals.get(tag.name) ?? 0) + amount);
        });
      }
    });
  });

  return Array.from(totals.entries())
    .map(([tag, total]) => ({ tag, total }))
    .sort((a, b) => (b.total as number) - (a.total as number));
}

/**
 * Compute product breakdown data for the breakdown chart.
 * Pure function. Uses `Number(entry.price) * entry.quantity`.
 */
export function computeProductBreakdownData(
  transactions: FullTransaction[],
): Array<Record<string, string | number>> {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    transaction.entries.forEach((entry) => {
      if (entry.type !== "expense") return;
      const amount = Number(entry.price) * entry.quantity;
      const name = entry.products?.name ?? "Unknown";
      totals.set(name, (totals.get(name) ?? 0) + amount);
    });
  });

  return Array.from(totals.entries())
    .map(([product, total]) => ({ product, total }))
    .sort((a, b) => (b.total as number) - (a.total as number));
}
