export type ComparisonDelta = {
  absolute: number; // current - comparison
  percentage: number; // ((current - comparison) / comparison) * 100, 0 when comparison is 0
  direction: "up" | "down" | "neutral";
  favorable: boolean; // context-dependent: expenses down = favorable, income up = favorable
};

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

export type DailyExpensesDataPoint = {
  day: number;
  value: number;
  comparison: number;
};
