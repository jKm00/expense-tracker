import { useMemo } from "react";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { FixedVariableMetrics } from "@/features/analytics/analytics.models";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { formatAmount } from "@/utils/format";
import { Anchor, Sparkles } from "lucide-react";

type FixedVsVariableProps = {
  metrics: FixedVariableMetrics;
  comparisonMetrics: FixedVariableMetrics;
};

export function FixedVsVariable({ metrics, comparisonMetrics }: FixedVsVariableProps) {
  const fixedIncomeDelta = useMemo(
    () => calculateComparisonDelta(metrics.fixedIncome, comparisonMetrics.fixedIncome, "up"),
    [metrics.fixedIncome, comparisonMetrics.fixedIncome],
  );

  const variableIncomeDelta = useMemo(
    () => calculateComparisonDelta(metrics.variableIncome, comparisonMetrics.variableIncome, "up"),
    [metrics.variableIncome, comparisonMetrics.variableIncome],
  );

  const fixedExpensesDelta = useMemo(
    () => calculateComparisonDelta(metrics.fixedExpenses, comparisonMetrics.fixedExpenses, "down"),
    [metrics.fixedExpenses, comparisonMetrics.fixedExpenses],
  );

  const variableExpensesDelta = useMemo(
    () => calculateComparisonDelta(metrics.variableExpenses, comparisonMetrics.variableExpenses, "down"),
    [metrics.variableExpenses, comparisonMetrics.variableExpenses],
  );

  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
      <KpiCard
        title="Fixed Income"
        subtitle="Recurring earnings"
        value={formatAmount(metrics.fixedIncome)}
        icon={Anchor}
        delta={fixedIncomeDelta}
      />
      <KpiCard
        title="Variable Income"
        subtitle="Irregular earnings"
        value={formatAmount(metrics.variableIncome)}
        icon={Sparkles}
        delta={variableIncomeDelta}
      />
      <KpiCard
        title="Fixed Expenses"
        subtitle="Recurring costs"
        value={formatAmount(metrics.fixedExpenses)}
        icon={Anchor}
        delta={fixedExpensesDelta}
      />
      <KpiCard
        title="Variable Expenses"
        subtitle="Irregular costs"
        value={formatAmount(metrics.variableExpenses)}
        icon={Sparkles}
        delta={variableExpensesDelta}
      />
    </div>
  );
}
