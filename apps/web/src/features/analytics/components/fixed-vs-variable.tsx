import { KpiCard } from "@/features/analytics/components/kpi-card";
import { FixedVariableMetrics } from "@/features/analytics/analytics.models";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import { Anchor, Sparkles } from "lucide-react";

type FixedVsVariableProps = {
  metrics: FixedVariableMetrics;
};

export function FixedVsVariable({ metrics }: FixedVsVariableProps) {
  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
      <KpiCard
        title="Fixed Income"
        subtitle="Recurring earnings"
        value={currencyFormatter.format(metrics.fixedIncome)}
        icon={Anchor}
      />
      <KpiCard
        title="Variable Income"
        subtitle="Irregular earnings"
        value={currencyFormatter.format(metrics.variableIncome)}
        icon={Sparkles}
      />
      <KpiCard
        title="Fixed Expenses"
        subtitle="Recurring costs"
        value={currencyFormatter.format(metrics.fixedExpenses)}
        icon={Anchor}
      />
      <KpiCard
        title="Variable Expenses"
        subtitle="Irregular costs"
        value={currencyFormatter.format(metrics.variableExpenses)}
        icon={Sparkles}
      />
    </div>
  );
}
