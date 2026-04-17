import { useMemo } from "react";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { AnalyticsMetrics } from "@/features/analytics/analytics.models";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";

type HeroKpisProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics;
};

export function HeroKpis({ metrics, comparisonMetrics }: HeroKpisProps) {
  const netBalanceDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.netBalance,
        comparisonMetrics.netBalance,
        "up",
      ),
    [metrics.netBalance, comparisonMetrics.netBalance],
  );

  const totalIncomeDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalIncome,
        comparisonMetrics.totalIncome,
        "up",
      ),
    [metrics.totalIncome, comparisonMetrics.totalIncome],
  );

  const totalExpensesDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalExpenses,
        comparisonMetrics.totalExpenses,
        "down",
      ),
    [metrics.totalExpenses, comparisonMetrics.totalExpenses],
  );

  return (
    <section className="grid gap-3 @md:grid-cols-3">
      <KpiCard
        title="Net Balance"
        subtitle="Income minus expenses"
        value={currencyFormatter.format(metrics.netBalance)}
        icon={Scale}
        delta={netBalanceDelta}
      />
      <KpiCard
        title="Total Income"
        subtitle="All money earned"
        value={currencyFormatter.format(metrics.totalIncome)}
        icon={TrendingUp}
        delta={totalIncomeDelta}
      />
      <KpiCard
        title="Total Expenses"
        subtitle="All money spent"
        value={currencyFormatter.format(metrics.totalExpenses)}
        icon={TrendingDown}
        delta={totalExpensesDelta}
      />
    </section>
  );
}
