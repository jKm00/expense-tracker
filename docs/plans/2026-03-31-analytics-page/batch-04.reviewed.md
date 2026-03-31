# Batch 4: Integration — AnalyticsContent + Route Wiring

> **Plan:** Analytics Page
> **Goal:** Implement the analytics page with summary cards, 3 charts, tag filtering, and period comparison.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 13: AnalyticsContent + Route Wiring

**Depends on:** Tasks 6, 7, 8, 9, 10, 11, 12 (all previous tasks)
**Can parallelize with:** Nothing

**Files:**
- Create: `src/features/analytics/components/analytics-content.tsx`
- Modify: `src/routes/_app.dashboard.analytics.tsx` (simplify RouteComponent, remove inline AnalyticsContent)

### Step 1: Create the AnalyticsContent orchestrator component

This is the main component that:
1. Reads `month`, `year`, `compare` from URL search params
2. Owns `includeTags` and `excludeTags` as local state
3. Calls `useAnalyticsData` hook
4. Distributes data to child components

Create `src/features/analytics/components/analytics-content.tsx`:

```tsx
import { useState, useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/_app.dashboard.analytics";
import { tagQueries } from "@/features/tags/tag.queries";
import type { Tag } from "@/features/tags/tag.models";
import type { ComparisonType } from "../analytics.types";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { AnalyticsFilters } from "./analytics-filters";
import { SummaryCards } from "./summary-cards";
import { DailySpendingChart } from "./daily-spending-chart";
import { SpendingByTagChart } from "./spending-by-tag-chart";
import { TopProductsChart } from "./top-products-chart";
import { EmptyState } from "@/components/custom/empty-state";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import dayjs from "dayjs";

export function AnalyticsContent() {
  // --- URL search params ---
  const { month: monthParam, year: yearParam, compare: compareParam } =
    Route.useSearch();

  const month = monthParam ?? dayjs().month();
  const year = yearParam ?? dayjs().year();
  const compare: ComparisonType = compareParam ?? "nothing";

  const navigate = useNavigate();

  // --- Local tag filter state ---
  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  // --- Fetch tags for filter comboboxes ---
  const {
    data: [_, tagsResult],
  } = useSuspenseQuery(tagQueries.getTagsOptions());
  const tags = tagsResult ?? [];

  // --- Analytics data hook ---
  const {
    metrics,
    comparisonMetrics,
    deltas,
    dailyData,
    comparisonDailyData,
    tagData,
    comparisonTagData,
    productData,
    isComparing,
    isComparisonLoading,
    comparisonError,
  } = useAnalyticsData({
    month,
    year,
    comparisonType: compare,
    includeTags: includeTags.map((t) => t.id),
    excludeTags: excludeTags.map((t) => t.id),
  });

  // --- Show toast on comparison error ---
  useEffect(() => {
    if (comparisonError) {
      toast.error("Could not load comparison data.");
    }
  }, [comparisonError]);

  // --- Handlers ---
  const handleCompareChange = useCallback(
    (value: ComparisonType) => {
      navigate({
        to: "/dashboard/analytics",
      search: (prev) => ({
        ...prev,
        compare: value === "nothing" ? undefined : value,
      }),
      });
    },
    [navigate],
  );

  const handleTagClick = useCallback(
    (tagId: string) => {
      if (tagId === "untagged") return;

      // If already the only include tag, clear the filter
      if (includeTags.length === 1 && includeTags[0].id === tagId) {
        setIncludeTags([]);
        return;
      }

      // Set clicked tag as the only include filter
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        setIncludeTags([tag]);
        // Also remove from exclude list to avoid the tag being excluded
        setExcludeTags((prev) => prev.filter((t) => t.id !== tagId));
      }
    },
    [includeTags, tags],
  );

  // --- Empty state ---
  if (metrics.transactionCount === 0 && !isComparing) {
    return (
      <div className="space-y-6">
        <AnalyticsFilters
          tags={tags}
          includeTags={includeTags}
          excludeTags={excludeTags}
          onIncludeTagsChange={setIncludeTags}
          onExcludeTagsChange={setExcludeTags}
          compare={compare}
          onCompareChange={handleCompareChange}
        />
        <EmptyState
          message="No transactions found for this month. Try a different month or adjust your filters."
          icon={BarChart3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <AnalyticsFilters
        tags={tags}
        includeTags={includeTags}
        excludeTags={excludeTags}
        onIncludeTagsChange={setIncludeTags}
        onExcludeTagsChange={setExcludeTags}
        compare={compare}
        onCompareChange={handleCompareChange}
      />

      {/* Summary Cards */}
      <SummaryCards
        metrics={metrics}
        comparisonMetrics={comparisonMetrics}
        deltas={deltas}
      />

      {/* Daily Spending Chart (full width) */}
      <DailySpendingChart
        data={dailyData}
        comparisonData={comparisonDailyData}
        isComparing={isComparing}
      />

      {/* Bottom charts (side by side on desktop) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByTagChart
          data={tagData}
          comparisonData={comparisonTagData}
          onTagClick={handleTagClick}
        />
        <TopProductsChart data={productData} isComparing={isComparing} />
      </div>
    </div>
  );
}
```

### Step 2: Simplify the route component

Now update `src/routes/_app.dashboard.analytics.tsx`. Replace the current `AnalyticsContent` function and simplify `RouteComponent`.

**Remove these things from the route file:**
1. The entire inline `AnalyticsContent` function (lines 64-161) — it's replaced by the imported version
2. The Combobox imports (no longer needed in route file)
3. The `FormField` import
4. The `Tag` type import
5. The `useSuspenseQuery` import (only needed if not used elsewhere in the file)

**Add this import:**

```typescript
import { AnalyticsContent } from "@/features/analytics/components/analytics-content";
```

**The final RouteComponent should be:**

```typescript
function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics">
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </PageHeader>
      {/* TODO: Fix loading skeleton */}
      <Suspense fallback={<p>Loading...</p>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
```

**The complete final route file should look like:**

```typescript
import { MonthSelect } from "@/components/custom/month-select";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import { tagQueries } from "@/features/tags/tag.queries";
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import { AnalyticsContent } from "@/features/analytics/components/analytics-content";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "react";
import z from "zod";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";

const analyticsSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
  compare: z.enum(["nothing", "month", "year"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year, compare } }) => ({
    month,
    year,
    compare,
  }),
  loader: async ({ context, deps }) => {
    const { month, year, compare } = deps;

    context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
    context.queryClient.prefetchQuery(productQueries.getProductsOptions());
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(month, year),
    );

    if (compare && compare !== "nothing") {
      const selected = dayjs()
        .year(year ?? dayjs().year())
        .month(month ?? dayjs().month());
      const compDate =
        compare === "month"
          ? selected.subtract(1, "month")
          : selected.subtract(1, "year");
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          compDate.month(),
          compDate.year(),
        ),
      );
    }
  },
  validateSearch: zodValidator(analyticsSearchSchema),
  component: RouteComponent,
  errorComponent: AnalyticsErrorComponent,
});

function AnalyticsErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics">
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </PageHeader>
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="size-12 text-destructive" />
        <p className="text-muted-foreground text-sm">
          Failed to load analytics data. Please try again.
        </p>
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics">
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </PageHeader>
      {/* TODO: Fix loading skeleton */}
      <Suspense fallback={<p>Loading...</p>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
```

### Step 3: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors related to analytics.

### Step 4: Run all tests

Run:

```bash
npm run test
```

Expected: All existing tests pass. Analytics utils tests pass.

> **Note:** There is no lint script configured in `package.json`. Type checking via `npx tsc --noEmit` (Step 3) is the only static analysis available.

### Step 5: Manual verification checklist

Test these scenarios in the browser (`/dashboard/analytics`):

1. **Basic render:** Page loads with 6 summary cards, daily spending chart, tag donut chart, and top products chart.
2. **Empty month:** Navigate to a month with no transactions — shows empty state message.
3. **Tag filtering:**
   - Select an include tag → only matching transactions shown across all cards and charts.
   - Select an exclude tag → matching transactions removed from all cards and charts.
   - Both include and exclude → exclude wins for overlapping tags.
4. **Comparison:**
   - Select "Last month" → delta indicators appear on cards, comparison line on daily chart, grouped bars on products chart.
   - Select "Last year" → same but compared to same month last year.
   - Select "No comparison" → deltas disappear.
5. **Month navigation:** Change month → `compare` param persists in URL.
6. **Donut drill-down:** Click a tag slice → that tag becomes the only include filter.
7. **Error handling:** If comparison data fails to load, page still shows current data and a toast notification.

### Step 6: Commit

```bash
git add src/features/analytics/components/analytics-content.tsx src/routes/_app.dashboard.analytics.tsx
git commit -m "feat(analytics): wire up AnalyticsContent orchestrator and simplify route"
```
