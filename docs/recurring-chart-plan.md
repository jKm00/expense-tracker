# Plan: Recurring Transactions Chart on Analytics Page

## Overview
Add a horizontal bar chart showing all recurring transactions sorted by price (most expensive → cheapest), so users can quickly see which subscriptions cost the most.

## Architecture

The chart follows the exact same pattern as `ExpensesByProductsChart` and `ExpensesByTagsChart` — a thin wrapper that transforms data and passes it to the reusable `HorizontalExpensesBarChart` component.

---

## 1. New Component: `recurring-expenses-chart.tsx`

**File:** `src/features/analytics/components/recurring-expenses-chart.tsx`

This component fetches recurring data via `useSuspenseQuery`, transforms it for the chart, and renders `HorizontalExpensesBarChart`.

```tsx
import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { HorizontalExpensesBarChart } from "./horizontal-expenses-bar-chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { RecurringWithProduct } from "@/features/recurring/recurring.models";

export function RecurringExpensesChart() {
  const {
    data: [, recurrings],
  } = useSuspenseQuery(recurringQueries.getRecurringsOptions());

  const allData = useMemo(() => {
    if (!recurrings) return [];

    return recurrings
      .filter(
        (r: RecurringWithProduct) => r.isActive && r.type === "expense",
      )
      .map((r: RecurringWithProduct) => ({
        name: r.products?.name ?? "Unknown",
        total: Number(r.price),
        interval: r.interval, // useful for tooltip later
      }))
      .sort((a, b) => b.total - a.total);
  }, [recurrings]);

  const chartConfig = {
    total: {
      label: "Recurring Cost",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <HorizontalExpensesBarChart
      title="Recurring Expenses"
      allData={allData}
      dataKey="name"
      chartConfig={chartConfig}
      yAxisWidth={110}
    />
  );
}
```

### Key decisions:
- **Filter `isActive` and `type === "expense"`** — only show active expense subscriptions (not income recurring entries or inactive ones).
- **Uses `var(--chart-4)`** — a different chart color than products (`--chart-2`) and tags (`--chart-1`) to visually distinguish it.
- **`dataKey="name"`** — the product name is the Y-axis label.
- **No data transformation needed beyond mapping** — each recurring entry is already one bar (unlike transactions which need aggregation).

> **NOTE:** Verify the return shape of `recurringController.getRecurrings`. The code assumes it returns `[error, RecurringWithProduct[]]` (same tuple pattern as transactions). If it returns `RecurringWithProduct[]` directly, remove the destructuring and use `data` directly instead of `[, recurrings]`.

---

## 2. Update: `analytics-dashboard.tsx`

**File:** `src/features/analytics/components/analytics-dashboard.tsx`

Add the new chart below the existing tag/product breakdown charts.

### Import to add (line ~13):
```tsx
import { RecurringExpensesChart } from "./recurring-expenses-chart";
```

### JSX to add after line 80 (after the closing `</div>` of the tag/product grid):
```tsx
<RecurringExpensesChart />
```

The full section at the bottom of the return becomes:

```tsx
      <div className="grid gap-6 @lg:grid-cols-2">
        <ExpensesByTagsChart transactions={transactions} />
        <ExpensesByProductsChart transactions={transactions} />
      </div>

      <RecurringExpensesChart />
    </div>
```

The recurring chart gets its own full-width row since it's independent of the current month's transaction data.

---

## 3. Update: Analytics Route Loader (prefetch)

**File:** `src/routes/_app/dashboard/analytics.tsx`

Add a prefetch for recurring data so the chart doesn't waterfall.

### Import to add (after line 14):
```tsx
import { recurringQueries } from "@/features/recurring/recurring.queries";
```

### Add to loader function (after line 51, before the closing `}`):
```tsx
    // Prefetch recurring entries for the recurring expenses chart
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringsOptions(),
    );
```

---

## 4. Update: Skeleton

**File:** `src/features/analytics/components/analytics-skeletons.tsx`

Add a skeleton for the recurring chart after the breakdown charts section (after line 67):

```tsx
      {/* 6. Recurring expenses chart */}
      <ChartCardSkeleton />
```

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/features/analytics/components/recurring-expenses-chart.tsx` | **CREATE** — New chart component |
| `src/features/analytics/components/analytics-dashboard.tsx:13,80` | **EDIT** — Import + render `RecurringExpensesChart` |
| `src/routes/_app/dashboard/analytics.tsx:14,51` | **EDIT** — Import + prefetch recurring query |
| `src/features/analytics/components/analytics-skeletons.tsx:67` | **EDIT** — Add skeleton placeholder |

## Caveats to verify during implementation
1. **Return shape of `getRecurrings`** — Check if it returns a `[error, data]` tuple or just `data`. Adjust destructuring accordingly in `recurring-expenses-chart.tsx`.
2. **`entryType` values** — Confirm `"expense"` is the correct string for the type enum (check `src/features/transactions/transactions.schema.ts` for the `entryType` pgEnum values).
