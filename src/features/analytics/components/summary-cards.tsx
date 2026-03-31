import {
  ArrowDownUp,
  DollarSign,
  Hash,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type {
  AnalyticsMetrics,
  ComparisonDelta,
} from "../analytics.types";
import { SummaryCard } from "./summary-card";

type SummaryCardsProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics | null;
  deltas: {
    expenses: ComparisonDelta;
    income: ComparisonDelta;
    net: ComparisonDelta;
    count: ComparisonDelta;
    dailyAvg: ComparisonDelta;
  } | null;
};

export function SummaryCards({
  metrics,
  comparisonMetrics,
  deltas,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <SummaryCard
        title="Total Expenses"
        value={formatCurrency(metrics.totalExpenses)}
        delta={deltas?.expenses}
        icon={TrendingDown}
      />
      <SummaryCard
        title="Total Income"
        value={formatCurrency(metrics.totalIncome)}
        delta={deltas?.income}
        icon={TrendingUp}
      />
      <SummaryCard
        title="Net Balance"
        value={formatCurrency(metrics.netBalance)}
        delta={deltas?.net}
        icon={Wallet}
      />
      <SummaryCard
        title="Transactions"
        value={metrics.transactionCount.toString()}
        delta={deltas?.count}
        showPercentage={false}
        icon={Hash}
      />
      <SummaryCard
        title="Daily Average"
        value={formatCurrency(metrics.dailyAverage)}
        delta={deltas?.dailyAvg}
        icon={ArrowDownUp}
      />
      <SummaryCard
        title="Biggest Expense"
        value={
          metrics.biggestExpense
            ? formatCurrency(metrics.biggestExpense.amount)
            : "—"
        }
        subtitle={biggestExpenseSubtitle(metrics, comparisonMetrics)}
        icon={DollarSign}
      />
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function biggestExpenseSubtitle(
  metrics: AnalyticsMetrics,
  comparisonMetrics: AnalyticsMetrics | null,
): string {
  if (!metrics.biggestExpense) return "No expenses";

  const currentLabel = metrics.biggestExpense.productName;

  if (!comparisonMetrics?.biggestExpense) return currentLabel;

  return `${currentLabel} (was ${formatCurrency(comparisonMetrics.biggestExpense.amount)} — ${comparisonMetrics.biggestExpense.productName})`;
}
