import { FullTransaction } from "@/features/transactions/transactions.models";
import { calculateAnalyticsMetrics } from "@/features/analytics/analytics.calculations";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { currencyFormatterNoDecimals } from "@/features/analytics/analytics.constants";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

type FinancialOverviewProps = {
  transactions: FullTransaction[];
  comparisonTransactions?: FullTransaction[];
};

export function FinancialOverview({
  transactions,
  comparisonTransactions,
}: FinancialOverviewProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions),
    [transactions],
  );

  const comparisonMetrics = useMemo(
    () =>
      comparisonTransactions
        ? calculateAnalyticsMetrics(comparisonTransactions)
        : undefined,
    [comparisonTransactions],
  );

  const netBalanceDelta = useMemo(
    () =>
      comparisonMetrics
        ? calculateComparisonDelta(
            metrics.netBalance,
            comparisonMetrics.netBalance,
            "up",
          )
        : undefined,
    [metrics.netBalance, comparisonMetrics?.netBalance],
  );

  const totalIncomeDelta = useMemo(
    () =>
      comparisonMetrics
        ? calculateComparisonDelta(
            metrics.totalIncome,
            comparisonMetrics.totalIncome,
            "up",
          )
        : undefined,
    [metrics.totalIncome, comparisonMetrics?.totalIncome],
  );

  const totalExpensesDelta = useMemo(
    () =>
      comparisonMetrics
        ? calculateComparisonDelta(
            metrics.totalExpenses,
            comparisonMetrics.totalExpenses,
            "down",
          )
        : undefined,
    [metrics.totalExpenses, comparisonMetrics?.totalExpenses],
  );

  return (
    <section className="grid gap-3 grid-cols-2">
      <div className="col-span-2">
        <KpiCard
          title="Balance"
          value={currencyFormatterNoDecimals.format(metrics.netBalance)}
          icon={Scale}
          delta={netBalanceDelta}
        />
      </div>
      <KpiCard
        title="Income"
        value={currencyFormatterNoDecimals.format(metrics.totalIncome)}
        icon={TrendingUp}
        delta={totalIncomeDelta}
        color="income"
      />
      <KpiCard
        title="Expenses"
        value={currencyFormatterNoDecimals.format(metrics.totalExpenses)}
        icon={TrendingDown}
        delta={totalExpensesDelta}
        color="expense"
      />
    </section>
  );
}
