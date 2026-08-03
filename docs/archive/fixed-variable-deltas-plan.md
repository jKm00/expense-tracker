# Plan: Add Delta Indicators to Fixed/Variable KPI Cards

## Summary

Add comparison deltas (e.g. "+12.3%") to the 4 KPI cards in `FixedVsVariable`: Fixed Income, Variable Income, Fixed Expenses, Variable Expenses. The `KpiCard` component already supports a `delta` prop (`ComparisonDelta`), and `calculateComparisonDelta()` already exists. The main work is computing comparison-period values and threading them through.

## Design Decisions

### Variable Income/Expenses
Straightforward: run `calculateVariableTotals()` on `comparisonTransactions` (already available in `AnalyticsDashboard`).

### Fixed Income/Expenses
Fixed totals come from the `recurrings` table (current active recurrings), not from transactions. There's no "previous period recurrings" data. Two options:

**Chosen approach**: Use the comparison period's *transactions* that have `source === "recurring"` to derive what the fixed totals were in the previous period. This captures actual recurring charges that hit in that period, reflecting adds/removes/price changes naturally.

```ts
export function calculateFixedTotalsFromTransactions(
  transactions: FullTransaction[],
): { fixedIncome: number; fixedExpenses: number } {
  let fixedIncome = 0;
  let fixedExpenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.source !== "recurring") return;

    transaction.entries.forEach((entry) => {
      const price = Math.abs(Number(entry.price)) * entry.quantity;
      if (entry.type === "income") {
        fixedIncome += price;
      } else {
        fixedExpenses += price;
      }
    });
  });

  return { fixedIncome, fixedExpenses };
}
```

**Note**: Current-period fixed totals also need to use this same function (from `transactions`) instead of `calculateFixedTotalsFromRecurrings(recurrings)` for an apples-to-apples comparison. Alternatively, keep current fixed from recurrings and compare against previous-period recurring transactions — the delta will show "how much your actual recurring spend changed". Either works; the plan uses the latter (keep current from recurrings, compare against previous recurring transactions) since the current behavior is already correct for showing "what you owe this month".

---

## File Changes

### 1. `apps/web/src/features/analytics/analytics.calculations.ts`

Add new function after `calculateVariableTotals` (~line 133):

```ts
/**
 * Calculate fixed income and expenses from recurring-sourced transactions.
 * Used for comparison periods where we need actual historical fixed totals.
 */
export function calculateFixedTotalsFromTransactions(
  transactions: FullTransaction[],
): { fixedIncome: number; fixedExpenses: number } {
  let fixedIncome = 0;
  let fixedExpenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.source !== "recurring") return;

    transaction.entries.forEach((entry) => {
      const price = Math.abs(Number(entry.price)) * entry.quantity;
      if (entry.type === "income") {
        fixedIncome += price;
      } else {
        fixedExpenses += price;
      }
    });
  });

  return { fixedIncome, fixedExpenses };
}
```

### 2. `apps/web/src/features/analytics/analytics.models.ts`

Extend `FixedVariableMetrics` — no changes needed. The model already has all 4 fields. We'll pass two instances (current + comparison) to the component.

### 3. `apps/web/src/features/analytics/components/analytics-dashboard.tsx`

**Add import** for `calculateFixedTotalsFromTransactions` (line 7):
```ts
import {
  calculateAnalyticsMetrics,
  calculateFixedTotalsFromRecurrings,
  calculateFixedTotalsFromTransactions,
  calculateVariableTotals,
  buildDailyExpensesData,
} from "@/features/analytics/analytics.calculations";
```

**Add comparison fixed/variable metrics** after `fixedVariableMetrics` (after line 64):
```ts
const comparisonFixedVariableMetrics = useMemo(() => {
  const { fixedIncome, fixedExpenses } = calculateFixedTotalsFromTransactions(comparisonTransactions);
  const { variableIncome, variableExpenses } = calculateVariableTotals(comparisonTransactions);
  return { fixedIncome, fixedExpenses, variableIncome, variableExpenses };
}, [comparisonTransactions]);
```

**Update `FixedVsVariable` usage** (line 88):
```tsx
<FixedVsVariable
  metrics={fixedVariableMetrics}
  comparisonMetrics={comparisonFixedVariableMetrics}
/>
```

### 4. `apps/web/src/features/analytics/components/fixed-vs-variable.tsx`

Replace entire file with:

```tsx
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
```

### 5. Other consumers of `FixedVsVariable`

Check if `FixedVsVariable` is used elsewhere. Based on grep, it's only used in `analytics-dashboard.tsx` — no other changes needed.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `apps/web/src/features/analytics/analytics.calculations.ts` | Add `calculateFixedTotalsFromTransactions()` |
| `apps/web/src/features/analytics/components/analytics-dashboard.tsx` | Compute `comparisonFixedVariableMetrics`, pass to `FixedVsVariable` |
| `apps/web/src/features/analytics/components/fixed-vs-variable.tsx` | Accept `comparisonMetrics` prop, compute 4 deltas, pass to `KpiCard` |

No changes needed to: `kpi-card.tsx`, `analytics.models.ts`, `analytics.utils.ts` — they already support everything needed.
