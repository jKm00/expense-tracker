import { FullTransaction } from "@/features/transactions/transactions.models";
import { AnalyticsMetrics, DailyExpensesDataPoint } from "./analytics.models";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import dayjs from "dayjs";

/**
 * Single-pass calculation of all analytics metrics from a transaction set.
 */
export function calculateAnalyticsMetrics(
  transactions: FullTransaction[],
): AnalyticsMetrics {
  let netBalance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let largest = 0;
  let totalItems = 0;
  let totalItemValue = 0;
  const activeDays = new Set<number>();

  transactions.forEach((transaction) => {
    const day = dayjs(transaction.date).date();
    activeDays.add(day);

    transaction.entries.forEach((entry) => {
      const price = Math.abs(Number(entry.price)) * entry.quantity;
      totalItems += entry.quantity;
      totalItemValue += Math.abs(Number(entry.price)) * entry.quantity;

      if (entry.type === "expense") {
        netBalance -= price;
        totalExpenses += price;

        if (price > largest) {
          largest = price;
        }
      } else {
        netBalance += price;
        totalIncome += price;
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
 * Calculate fixed income and fixed expenses from the recurrings table.
 * Only includes active, non-deleted recurrings.
 * For yearly recurrings, divides by 12 to get a monthly equivalent.
 * For weekly recurrings, multiplies by ~4.33 to get a monthly equivalent.
 */
export function calculateFixedTotalsFromRecurrings(
  recurrings: RecurringWithProduct[],
): { fixedIncome: number; fixedExpenses: number } {
  let fixedIncome = 0;
  let fixedExpenses = 0;

  recurrings.forEach((r) => {
    if (!r.isActive) return;

    const price = Math.abs(Number(r.price));
    let monthlyPrice: number;

    switch (r.interval) {
      case "weekly":
        monthlyPrice = price * (52 / 12);
        break;
      case "monthly":
        monthlyPrice = price;
        break;
      case "yearly":
        monthlyPrice = price / 12;
        break;
      default:
        monthlyPrice = price;
    }

    if (r.type === "income") {
      fixedIncome += monthlyPrice;
    } else {
      fixedExpenses += monthlyPrice;
    }
  });

  return { fixedIncome, fixedExpenses };
}

/**
 * Calculate variable income and expenses from non-recurring transactions.
 */
export function calculateVariableTotals(
  transactions: FullTransaction[],
): { variableIncome: number; variableExpenses: number } {
  let variableIncome = 0;
  let variableExpenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.source === "recurring") return;

    transaction.entries.forEach((entry) => {
      const price = Math.abs(Number(entry.price)) * entry.quantity;
      if (entry.type === "income") {
        variableIncome += price;
      } else {
        variableExpenses += price;
      }
    });
  });

  return { variableIncome, variableExpenses };
}

/**
 * Builds per-day expense totals for current and comparison periods.
 */
export function buildDailyExpensesData(
  transactions: FullTransaction[],
  comparisonTransactions: FullTransaction[],
  month: number,
  year: number,
): DailyExpensesDataPoint[] {
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
