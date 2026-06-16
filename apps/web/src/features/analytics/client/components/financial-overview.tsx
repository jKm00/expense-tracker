import { FullTransaction } from "@/features/transactions/shared/transactions.models";
import { calculateAnalyticsMetrics } from "@/features/analytics/shared/analytics.calculations";
import { calculateComparisonDelta } from "@/features/analytics/shared/analytics.utils";
import { formatAmountNoDecimals } from "@/utils/format";
import { KpiCard } from "@/features/analytics/client/components/kpi-card";
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
          value={formatAmountNoDecimals(metrics.netBalance, { sign: true })}
          icon={Scale}
          delta={netBalanceDelta}
          color={metrics.netBalance < 0 ? "expense" : "income"}
        />
      </div>
      <KpiCard
        title="Income"
        value={formatAmountNoDecimals(metrics.totalIncome)}
        icon={TrendingUp}
        delta={totalIncomeDelta}
      />
      <KpiCard
        title="Expenses"
        value={formatAmountNoDecimals(metrics.totalExpenses)}
        icon={TrendingDown}
        delta={totalExpensesDelta}
      />
    </section>
  );
}
