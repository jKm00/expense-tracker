// src/features/analytics/components/quick-stats.tsx
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { Percent, Calendar, TrendingUp, Activity } from "lucide-react";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import type { QuickStatsProps } from "@/features/analytics/analytics.models";

export function QuickStats({ metrics, deltas }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
      <KpiCard
        title="Savings Rate"
        subtitle="Of income saved"
        value={`${metrics.savingsRate.toFixed(1)}%`}
        icon={Percent}
        delta={deltas.savingsRate}
      />
      <KpiCard
        title="Daily Spending"
        subtitle="Average per active day"
        value={currencyFormatter.format(metrics.dailySpending)}
        icon={Calendar}
        delta={deltas.dailySpending}
      />
      <KpiCard
        title="Largest Expense"
        subtitle="Single biggest item"
        value={currencyFormatter.format(metrics.largest)}
        icon={TrendingUp}
        delta={deltas.largest}
      />
      <KpiCard
        title="Active Days"
        subtitle="Days with transactions"
        value={`${metrics.activeDays}`}
        icon={Activity}
        delta={deltas.activeDays}
      />
    </div>
  );
}
