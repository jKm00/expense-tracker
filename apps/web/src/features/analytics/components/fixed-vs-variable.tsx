import { KpiCard } from "@/features/analytics/components/kpi-card";
import { FixedVariableMetrics } from "@/features/analytics/analytics.models";
import { formatAmount } from "@/utils/format";
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
        value={formatAmount(metrics.fixedIncome)}
        icon={Anchor}
      />
      <KpiCard
        title="Variable Income"
        subtitle="Irregular earnings"
        value={formatAmount(metrics.variableIncome)}
        icon={Sparkles}
      />
      <KpiCard
        title="Fixed Expenses"
        subtitle="Recurring costs"
        value={formatAmount(metrics.fixedExpenses)}
        icon={Anchor}
      />
      <KpiCard
        title="Variable Expenses"
        subtitle="Irregular costs"
        value={formatAmount(metrics.variableExpenses)}
        icon={Sparkles}
      />
    </div>
  );
}
