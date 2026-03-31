# Batch 2: Data Layer — Route Updates, MonthSelect Fix, Analytics Hook

> **Plan:** Analytics Page
> **Goal:** Implement the analytics page with summary cards, 3 charts, tag filtering, and period comparison.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 4: Route Updates

**Depends on:** Nothing (but batch-01 should be complete for the full pipeline to work)
**Can parallelize with:** Task 5

**Files:**
- Modify: `src/routes/_app.dashboard.analytics.tsx:33-45` (search schema, loaderDeps, loader, errorComponent)

### Step 1: Update the route configuration

Open `src/routes/_app.dashboard.analytics.tsx`. Make these changes:

**1a. Add imports at the top of the file:**

Add these imports alongside existing ones:

```typescript
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
```

**1b. Extend the search schema** (line 33-36):

Replace the current `analyticsSearchSchema`:

```typescript
const analyticsSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});
```

With:

```typescript
const analyticsSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
  compare: z.enum(["nothing", "month", "year"]).optional(),
});
```

**1c. Update `loaderDeps`** to include `compare` (line 39):

Replace:

```typescript
loaderDeps: ({ search: { month, year } }) => ({ month, year }),
```

With:

```typescript
loaderDeps: ({ search: { month, year, compare } }) => ({ month, year, compare }),
```

**1d. Update the loader** to prefetch transactions, products, and comparison data (line 40-42):

Replace the current loader:

```typescript
loader: async ({ context, deps }) => {
  context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
},
```

With:

```typescript
loader: async ({ context, deps }) => {
  const { month, year, compare } = deps;

  // Always prefetch: tags, products, current month transactions
  context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
  context.queryClient.prefetchQuery(productQueries.getProductsOptions());
  context.queryClient.prefetchQuery(
    transactionQueries.getTransactionsOptions(month, year),
  );

  // Conditionally prefetch comparison period transactions
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
```

**1e. Add `errorComponent`** to the route config (after `component: RouteComponent`):

```typescript
errorComponent: AnalyticsErrorComponent,
```

**1f. Create the error component** (add before `RouteComponent`):

```typescript
function AnalyticsErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
```

**The full Route config after all changes:**

```typescript
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
```

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors related to the analytics route.

### Step 3: Commit

```bash
git add src/routes/_app.dashboard.analytics.tsx
git commit -m "feat(analytics): update route with comparison search param, loader prefetching, and error component"
```

---

## Task 5: MonthSelect — Preserve Search Params

**Depends on:** Nothing
**Can parallelize with:** Task 4

**Files:**
- Modify: `src/components/custom/month-select.tsx:50-58`

### Step 1: Update the handleNavigate function

The current `MonthSelect` component replaces ALL search params when navigating:

```typescript
function handleNavigate(month: number, year: number) {
  navigate({
    to,
    search: {
      month,
      year,
    },
  });
}
```

This wipes the `compare` search param when the user changes months. Update it to preserve other params:

```typescript
function handleNavigate(month: number, year: number) {
  navigate({
    to,
    search: (prev) => ({
      ...prev,
      month,
      year,
    }),
  });
}
```

This uses TanStack Router's function-form of `search` which receives the previous search params and merges them with the new month/year values.

### Step 2: Verify the transactions page still works

The MonthSelect is also used in the transactions page (`/_app/dashboard/transactions/`). The `...prev` spread preserves existing params for both routes. The transactions route only has `month` and `year` params, so `...prev` will contain only those — no change in behavior.

### Step 3: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No type errors.

### Step 4: Commit

```bash
git add src/components/custom/month-select.tsx
git commit -m "fix(month-select): preserve other search params when navigating months"
```

---

## Task 6: Analytics Data Hook

**Depends on:** Task 2 (types), Task 3 (utils), Task 4 (route search schema)
**Can parallelize with:** Task 5

**Files:**
- Create: `src/features/analytics/hooks/use-analytics-data.ts`

### Step 1: Create the hook file

Create `src/features/analytics/hooks/use-analytics-data.ts`:

```typescript
import { useMemo } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import type {
  AnalyticsMetrics,
  ComparisonDelta,
  ComparisonType,
  DailyChartDataPoint,
  EnrichedTransaction,
  ProductChartDataPoint,
  TagChartDataPoint,
} from "../analytics.types";
import {
  enrichTransactionsWithTags,
  filterByTags,
  computeMetrics,
  computeDelta,
  groupByDay,
  groupByTag,
  getTopProducts,
} from "../analytics.utils";

type UseAnalyticsDataParams = {
  month: number; // 0-indexed
  year: number;
  comparisonType: ComparisonType;
  includeTags: string[];
  excludeTags: string[];
};

type UseAnalyticsDataReturn = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics | null;
  deltas: {
    expenses: ComparisonDelta;
    income: ComparisonDelta;
    net: ComparisonDelta;
    count: ComparisonDelta;
    dailyAvg: ComparisonDelta;
  } | null;
  dailyData: DailyChartDataPoint[];
  comparisonDailyData: DailyChartDataPoint[] | null;
  tagData: TagChartDataPoint[];
  comparisonTagData: TagChartDataPoint[] | null;
  productData: ProductChartDataPoint[];
  isComparing: boolean;
  isComparisonLoading: boolean;
  comparisonError: Error | null;
};

export function useAnalyticsData(
  params: UseAnalyticsDataParams,
): UseAnalyticsDataReturn {
  // IMPORTANT: comparisonType MUST come from `Route.useSearch().compare` via
  // props — never use local state for this value. The URL search params are
  // the single source of truth for comparison mode.
  const { month, year, comparisonType, includeTags, excludeTags } = params;

  // --- 1. Fetch current month transactions (Suspense — prefetched by loader) ---
  const { data: currentTransactionsResult } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(month, year),
  );

  // --- 2. Fetch products with tags (Suspense — prefetched by loader) ---
  const { data: productsResult } = useSuspenseQuery(
    productQueries.getProductsOptions(),
  );

  // --- 3. Compute comparison period ---
  const comparisonPeriod = useMemo(() => {
    if (comparisonType === "nothing") return null;
    const selected = dayjs().year(year).month(month);
    const compDate =
      comparisonType === "month"
        ? selected.subtract(1, "month")
        : selected.subtract(1, "year");
    return { month: compDate.month(), year: compDate.year() };
  }, [comparisonType, month, year]);

  // --- 4. Fetch comparison transactions (non-Suspense — graceful degradation) ---
  // Only create query options when we have a valid comparison period.
  // This avoids creating query keys with dummy (0, 0) params.
  const comparisonQueryOptions = comparisonPeriod
    ? transactionQueries.getTransactionsOptions(
        comparisonPeriod.month,
        comparisonPeriod.year,
      )
    : null;

  const {
    data: comparisonTransactionsResult,
    isLoading: isComparisonLoading,
    error: comparisonError,
  } = useQuery({
    // When comparisonPeriod is null, comparisonQueryOptions is null too.
    // We still need a valid queryKey/queryFn for useQuery, but `enabled: false`
    // ensures the queryFn never executes. We return `null` (not throw) so that
    // if `enabled` logic ever changes, we get a safe no-op instead of a crash.
    ...(comparisonQueryOptions ?? {
      queryKey: ["transactions", "comparison", "disabled"],
      queryFn: () => null,
    }),
    enabled: comparisonPeriod !== null,
  });

  // --- 5. Unwrap results ---
  // Result pattern: [err, data] — we use index [1] for data
  const currentTransactions = currentTransactionsResult[1] ?? [];
  const products = productsResult[1] ?? [];
  const comparisonTransactions =
    comparisonPeriod && comparisonTransactionsResult
      ? comparisonTransactionsResult[1] ?? []
      : null;

  // --- 6. Enrich with tags ---
  const enrichedCurrent = useMemo(
    () => enrichTransactionsWithTags(currentTransactions, products),
    [currentTransactions, products],
  );

  const enrichedComparison = useMemo(
    () =>
      comparisonTransactions
        ? enrichTransactionsWithTags(comparisonTransactions, products)
        : null,
    [comparisonTransactions, products],
  );

  // --- 7. Filter by tags ---
  const filteredCurrent = useMemo(
    () => filterByTags(enrichedCurrent, includeTags, excludeTags),
    [enrichedCurrent, includeTags, excludeTags],
  );

  const filteredComparison = useMemo(
    () =>
      enrichedComparison
        ? filterByTags(enrichedComparison, includeTags, excludeTags)
        : null,
    [enrichedComparison, includeTags, excludeTags],
  );

  // --- 8. Compute metrics ---
  const daysInCurrentMonth = dayjs().year(year).month(month).daysInMonth();
  const daysInComparisonMonth = comparisonPeriod
    ? dayjs()
        .year(comparisonPeriod.year)
        .month(comparisonPeriod.month)
        .daysInMonth()
    : 0;

  const metrics = useMemo(
    () => computeMetrics(filteredCurrent, daysInCurrentMonth),
    [filteredCurrent, daysInCurrentMonth],
  );

  const comparisonMetrics = useMemo(
    () =>
      filteredComparison
        ? computeMetrics(filteredComparison, daysInComparisonMonth)
        : null,
    [filteredComparison, daysInComparisonMonth],
  );

  // --- 9. Compute chart data ---
  const dailyData = useMemo(
    () => groupByDay(filteredCurrent, year, month),
    [filteredCurrent, year, month],
  );

  const comparisonDailyData = useMemo(
    () =>
      filteredComparison && comparisonPeriod
        ? groupByDay(
            filteredComparison,
            comparisonPeriod.year,
            comparisonPeriod.month,
          )
        : null,
    [filteredComparison, comparisonPeriod],
  );

  const tagData = useMemo(
    () => groupByTag(filteredCurrent),
    [filteredCurrent],
  );

  const comparisonTagData = useMemo(
    () => (filteredComparison ? groupByTag(filteredComparison) : null),
    [filteredComparison],
  );

  const productData = useMemo(
    () => getTopProducts(filteredCurrent, filteredComparison, 8),
    [filteredCurrent, filteredComparison],
  );

  // --- 10. Compute deltas ---
  const isComparing = comparisonType !== "nothing" && comparisonMetrics !== null;

  const deltas = useMemo(() => {
    if (!comparisonMetrics) return null;

    return {
      expenses: computeDelta(
        metrics.totalExpenses,
        comparisonMetrics.totalExpenses,
        true, // expenses down = favorable
      ),
      income: computeDelta(metrics.totalIncome, comparisonMetrics.totalIncome),
      net: computeDelta(metrics.netBalance, comparisonMetrics.netBalance),
      count: computeDelta(
        metrics.transactionCount,
        comparisonMetrics.transactionCount,
      ),
      dailyAvg: computeDelta(
        metrics.dailyAverage,
        comparisonMetrics.dailyAverage,
        true, // daily average down = favorable
      ),
    };
  }, [metrics, comparisonMetrics]);

  return {
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
    comparisonError: comparisonError as Error | null,
  };
}
```

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors.

### Step 3: Commit

```bash
git add src/features/analytics/hooks/use-analytics-data.ts
git commit -m "feat(analytics): add useAnalyticsData hook for data fetching and computation"
```
