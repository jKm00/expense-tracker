import { FullTransaction } from "@/features/transactions/transactions.models";
import { AnalyticsMetrics, DailyExpensesDataPoint } from "./analytics.models";
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
      const price = Math.abs(Number(entry.price)) * entry.quantity;
      totalItems += entry.quantity;
      totalItemValue += Math.abs(Number(entry.price)) * entry.quantity;

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
