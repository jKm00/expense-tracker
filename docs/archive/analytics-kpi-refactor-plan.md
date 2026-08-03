# Analytics KPI Refactor Plan

Two changes: (1) calculate fixed income/expenses from the `recurrings` table instead of transaction `source` field, and (2) swap the positions of the "Fixed vs Variable" and "Quick Stats" KPI sections.

---

## Change 1: Fixed Income/Expenses from Recurrings Table

### Problem
Currently, `fixedIncome` and `fixedExpenses` are calculated in `calculateAnalyticsMetrics()` by checking `transaction.source === "recurring"` (line 27 of `analytics.calculations.ts`). This should instead come directly from the `recurrings` table.

### Approach
Sum active recurring entries by type (`income`/`expense`) from the recurrings data already fetched via `recurringQueries.getRecurringsOptions()`. Pass these sums into the analytics dashboard alongside the transaction-derived metrics.

### Step 1: Add recurrings data to `AnalyticsLoader`

**File:** `apps/web/src/features/analytics/components/analytics-loader.tsx`

Add a `useSuspenseQuery` for recurrings and pass the data down:

```tsx
// Add import at top (line ~4)
import { recurringQueries } from "@/features/recurring/recurring.queries";

// After the comparison transactions query (after line 43), add:
const { data: recurrings } = useSuspenseQuery(
  recurringQueries.getRecurringsOptions(),
);

// Update the AnalyticsDashboard render (line 93-100) to pass recurrings:
<AnalyticsDashboard
  transactions={filteredTransactions}
  comparisonTransactions={filteredComparisonTransactions}
  recurrings={recurrings ?? []}
  month={selectedMonth}
  year={selectedYear}
  compareMonth={compareMonth}
  compareYear={compareYear}
/>
```

### Step 2: Create a helper to calculate fixed totals from recurrings

**File:** `apps/web/src/features/analytics/analytics.calculations.ts`

Add a new function after `calculateAnalyticsMetrics`:

```ts
import { RecurringWithProduct } from "@/features/recurring/recurring.models";

/**
 * Calculate fixed income and fixed expenses from the recurrings table.
 * Only includes active, non-deleted recurrings.
 * For yearly recurrings, divides by 12 to get a monthly equivalent.
 * For weekly recurrings, multiplies by ~4.33 to get a monthly equivalent.
 */
export function calculateFixedTotalsFromRecurrings(
  recurrings: RecurringWithProduct[],
): { fixedIncome: number; fixedExpenses: number } {
  let fixedIncome = 0;
  let fixedExpenses = 0;

  recurrings.forEach((r) => {
    if (!r.isActive) return;

    const price = Math.abs(Number(r.price));
    let monthlyPrice: number;

    switch (r.interval) {
      case "weekly":
        monthlyPrice = price * (52 / 12); // ~4.33 weeks per month
        break;
      case "monthly":
        monthlyPrice = price;
        break;
      case "yearly":
        monthlyPrice = price / 12;
        break;
      default:
        monthlyPrice = price;
    }

    if (r.type === "income") {
      fixedIncome += monthlyPrice;
    } else {
      fixedExpenses += monthlyPrice;
    }
  });

  return { fixedIncome, fixedExpenses };
}
```

### Step 3: Remove fixed income/expense calculation from transaction loop

**File:** `apps/web/src/features/analytics/analytics.calculations.ts`

In `calculateAnalyticsMetrics()`:
- Remove lines 14-16 (`fixedIncome`, `variableIncome`, `fixedExpenses`, `variableExpenses` variable declarations)
- Remove line 27 (`const isRecurring = ...`)
- Remove lines 38-42 (the `if (isRecurring) { fixedExpenses } else { variableExpenses }` block) — just keep `totalExpenses += price`
- Remove lines 51-55 (the `if (isRecurring) { fixedIncome } else { variableIncome }` block) — just keep `totalIncome += price`
- Remove `fixedIncome`, `variableIncome`, `fixedExpenses`, `variableExpenses` from the return object

### Step 4: Update `AnalyticsMetrics` type

**File:** `apps/web/src/features/analytics/analytics.models.ts`

Remove `fixedIncome`, `variableIncome`, `fixedExpenses`, `variableExpenses` from the `AnalyticsMetrics` type (lines 12-15).

Create a new type:

```ts
export type FixedVariableMetrics = {
  fixedIncome: number;
  fixedExpenses: number;
  variableIncome: number;  // computed as totalIncome - fixedIncome
  variableExpenses: number; // computed as totalExpenses - fixedExpenses
};
```

### Step 5: Update `AnalyticsDashboard` to compute fixed/variable metrics

**File:** `apps/web/src/features/analytics/components/analytics-dashboard.tsx`

```tsx
// Add imports
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import { calculateFixedTotalsFromRecurrings } from "@/features/analytics/analytics.calculations";

// Update props type (line 16-23) to include recurrings:
type AnalyticsDashboardProps = {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
  recurrings: RecurringWithProduct[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

// After the existing useMemo calls (after line 44), add:
const fixedTotals = useMemo(
  () => calculateFixedTotalsFromRecurrings(recurrings),
  [recurrings],
);

const fixedVariableMetrics = useMemo(() => ({
  fixedIncome: fixedTotals.fixedIncome,
  fixedExpenses: fixedTotals.fixedExpenses,
  variableIncome: Math.max(0, metrics.totalIncome - fixedTotals.fixedIncome),
  variableExpenses: Math.max(0, metrics.totalExpenses - fixedTotals.fixedExpenses),
}), [fixedTotals, metrics]);

// Pass fixedVariableMetrics to the FixedVsVariable component (see Change 2)
// and to DetailedKpis
```

### Step 6: Update `DetailedKpis` to accept separate fixed/variable metrics

**File:** `apps/web/src/features/analytics/components/detailed-kpis.tsx`

Update the props to accept `fixedVariableMetrics` of type `FixedVariableMetrics` instead of reading from `metrics.fixedIncome` etc. Replace all references:
- `metrics.fixedIncome` → `fixedVariableMetrics.fixedIncome`
- `metrics.fixedExpenses` → `fixedVariableMetrics.fixedExpenses`
- `metrics.variableIncome` → `fixedVariableMetrics.variableIncome`
- `metrics.variableExpenses` → `fixedVariableMetrics.variableExpenses`

Same for `comparisonMetrics` — since comparison period won't have recurrings comparison data, the comparison deltas for fixed/variable KPIs should be removed (set to `null`/hidden) or kept as-is showing no comparison. **Decision: remove comparison deltas for fixed/variable KPIs since recurrings represent current state, not historical.**

Update the KpiCard calls for fixed/variable to not pass `delta` props.

---

## Change 2: Swap KPI Section Positions

### Current Layout
1. `HeroKpis` — always visible (net balance, total income, total expenses)
2. Charts
3. `QuickStats` — always visible sidebar (savings rate, daily spending, largest expense, active days)
4. `DetailedKpis` — collapsible dropdown containing:
   - "Fixed vs Variable" section (fixed income, variable income, fixed expenses, variable expenses)
   - "Transactions & Items" section

### Target Layout
1. `HeroKpis` — always visible (unchanged)
2. **`FixedVsVariable`** — always visible sidebar (replaces QuickStats position)
3. Charts
4. `DetailedKpis` — collapsible dropdown containing:
   - **`QuickStats` content** (savings rate, daily spending, largest expense, active days) — moved here
   - "Transactions & Items" section (unchanged)

### Step 7: Extract "Fixed vs Variable" into its own component

**File (new):** `apps/web/src/features/analytics/components/fixed-vs-variable.tsx`

```tsx
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
```

### Step 8: Move QuickStats content into DetailedKpis

**File:** `apps/web/src/features/analytics/components/detailed-kpis.tsx`

- Remove the "Fixed vs Variable" section (lines 147-182)
- Add a new "Quick Stats" section at the top of the collapsible content with the 4 KPIs from `QuickStats` (savings rate, daily spending, largest expense, active days) — copy the KpiCard markup and delta calculations from `quick-stats.tsx`
- Update the metrics count in the button label from `9 metrics` to `9 metrics` (4 quick stats + 5 transaction details = 9, same count)

The new structure inside the `{isOpen && ...}` block:

```tsx
{isOpen && (
  <div className="mt-3 space-y-4">
    {/* Quick Stats (moved from sidebar) */}
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Spending Overview
      </h3>
      <div className="grid gap-2 @sm:grid-cols-2 @lg:grid-cols-4">
        <KpiCard title="Savings Rate" subtitle="Of income saved" value={`${metrics.savingsRate.toFixed(1)}%`} icon={Percent} delta={savingsRateDelta} />
        <KpiCard title="Daily Spending" subtitle="Average per active day" value={currencyFormatter.format(metrics.dailySpending)} icon={Calendar} delta={dailySpendingDelta} />
        <KpiCard title="Largest Expense" subtitle="Single biggest item" value={currencyFormatter.format(metrics.largest)} icon={TrendingUp} delta={largestDelta} />
        <KpiCard title="Active Days" subtitle="Days with transactions" value={`${metrics.activeDays}`} icon={Activity} delta={activeDaysDelta} />
      </div>
    </div>

    {/* Transaction details (unchanged) */}
    ...
  </div>
)}
```

Add the necessary imports (`Percent`, `Calendar`, `TrendingUp`, `Activity` from lucide-react) and delta calculations (copy from `quick-stats.tsx` lines 14-52).

### Step 9: Update `AnalyticsDashboard` layout

**File:** `apps/web/src/features/analytics/components/analytics-dashboard.tsx`

Replace `QuickStats` with `FixedVsVariable` in the sidebar position:

```tsx
import { FixedVsVariable } from "./fixed-vs-variable";
// Remove: import { QuickStats } from "./quick-stats";

// In the JSX (lines 59-69), replace:
<div className="grid gap-6 @xl:grid-cols-[1fr_280px] items-start">
  <DailyActivityChart ... />
  <FixedVsVariable metrics={fixedVariableMetrics} />
</div>
```

Pass `fixedVariableMetrics` is no longer needed in `DetailedKpis` since we removed the fixed/variable section from it.

### Step 10: Clean up `QuickStats` component

**File:** `apps/web/src/features/analytics/components/quick-stats.tsx`

This file can be deleted since its content has been moved into `DetailedKpis`.

---

## Summary of File Changes

| File | Action |
|------|--------|
| `apps/web/src/features/analytics/analytics.models.ts` | Remove fixed/variable from `AnalyticsMetrics`, add `FixedVariableMetrics` type |
| `apps/web/src/features/analytics/analytics.calculations.ts` | Remove fixed/variable from transaction loop, add `calculateFixedTotalsFromRecurrings()` |
| `apps/web/src/features/analytics/components/analytics-loader.tsx` | Fetch recurrings data, pass to dashboard |
| `apps/web/src/features/analytics/components/analytics-dashboard.tsx` | Compute fixed/variable from recurrings, swap QuickStats→FixedVsVariable |
| `apps/web/src/features/analytics/components/fixed-vs-variable.tsx` | **New file** — extracted Fixed vs Variable KPI cards |
| `apps/web/src/features/analytics/components/detailed-kpis.tsx` | Remove Fixed vs Variable section, add Quick Stats section, remove fixed/variable props |
| `apps/web/src/features/analytics/components/quick-stats.tsx` | **Delete** — content moved into DetailedKpis |
