import { useMemo } from "react";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { AnalyticsMetrics } from "@/features/analytics/analytics.models";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import { Percent, Calendar, TrendingUp, Activity } from "lucide-react";

type QuickStatsProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics;
};

export function QuickStats({ metrics, comparisonMetrics }: QuickStatsProps) {
  const savingsRateDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.savingsRate,
        comparisonMetrics.savingsRate,
        "up",
      ),
    [metrics.savingsRate, comparisonMetrics.savingsRate],
  );

  const dailySpendingDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.dailySpending,
        comparisonMetrics.dailySpending,
        "down",
      ),
    [metrics.dailySpending, comparisonMetrics.dailySpending],
  );

  const largestDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.largest,
        comparisonMetrics.largest,
        "down",
      ),
    [metrics.largest, comparisonMetrics.largest],
  );

  const activeDaysDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.activeDays,
        comparisonMetrics.activeDays,
        "up",
      ),
    [metrics.activeDays, comparisonMetrics.activeDays],
  );

  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
      <KpiCard
        title="Savings Rate"
        subtitle="Of income saved"
        value={`${metrics.savingsRate.toFixed(1)}%`}
        icon={Percent}
        delta={savingsRateDelta}
      />
      <KpiCard
        title="Daily Spending"
        subtitle="Average per active day"
        value={currencyFormatter.format(metrics.dailySpending)}
        icon={Calendar}
        delta={dailySpendingDelta}
      />
      <KpiCard
        title="Largest Expense"
        subtitle="Single biggest item"
        value={currencyFormatter.format(metrics.largest)}
        icon={TrendingUp}
        delta={largestDelta}
      />
      <KpiCard
        title="Active Days"
        subtitle="Days with transactions"
        value={`${metrics.activeDays}`}
        icon={Activity}
        delta={activeDaysDelta}
      />
    </div>
  );
}
