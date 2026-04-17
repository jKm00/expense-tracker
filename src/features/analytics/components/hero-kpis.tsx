// src/features/analytics/components/hero-kpis.tsx
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import type { HeroKpisProps } from "@/features/analytics/analytics.models";

export function HeroKpis({ metrics, deltas }: HeroKpisProps) {
  return (
    <section className="grid gap-3 @md:grid-cols-3">
      <KpiCard
        title="Net Balance"
        subtitle="Income minus expenses"
        value={currencyFormatter.format(metrics.netBalance)}
        icon={Scale}
        delta={deltas.netBalance}
      />
      <KpiCard
        title="Total Income"
        subtitle="All money earned"
        value={currencyFormatter.format(metrics.totalIncome)}
        icon={TrendingUp}
        delta={deltas.totalIncome}
      />
      <KpiCard
        title="Total Expenses"
        subtitle="All money spent"
        value={currencyFormatter.format(metrics.totalExpenses)}
        icon={TrendingDown}
        delta={deltas.totalExpenses}
      />
    </section>
  );
}
