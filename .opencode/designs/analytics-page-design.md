# Analytics Page Design

**Date:** 2026-03-31
**Status:** Approved

## Problem

The expense tracker app has an analytics route (`/dashboard/analytics`) with a page header, month selector, tag filter comboboxes, and a comparison type selector — but no actual analytics content. Users need visual insights into their spending patterns, income, and category breakdowns for a selected month, with optional comparison to a previous period.

## Decisions

### 1. Chart Library — Recharts via shadcn/ui `chart` Component

**Decision:** Use the shadcn/ui `chart` component, which wraps Recharts with `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, and `ChartLegendContent`.

**Reasoning:**
- shadcn/ui already provides a first-party chart component built on Recharts — this is the blessed path for this stack.
- Composition-based: you use standard Recharts components (`BarChart`, `PieChart`, `Bar`, `Pie`, `XAxis`, etc.) inside `ChartContainer`. No lock-in to a custom abstraction.
- Theming via CSS variables integrates with existing Tailwind v4 + shadcn setup. Supports light/dark mode automatically.
- Recharts has the largest React charting ecosystem, good docs, and declarative API.

**Alternatives considered:**
- **Visx** — More control, but much more boilerplate. Overkill for a personal expense tracker.
- **Tremor** — Has its own design system that would conflict with shadcn/ui.
- **Chart.js (react-chartjs-2)** — Canvas-based, less React-native, no shadcn integration.

**Installation:**
```bash
npx shadcn@latest add chart
```
This installs `recharts` as a dependency and creates `src/components/ui/chart.tsx`.

### 2. Data Architecture — Compose Existing Endpoints Client-Side

**Decision:** Zero backend changes. Fetch data from existing endpoints and join client-side.

**Data sources:**
1. `transactionQueries.getTransactionsOptions(month, year)` — returns `[err, {transaction, product}[]]`
2. `productQueries.getProductsOptions()` — returns `[err, ProductWithTags[]]` (includes tags via join)
3. `tagQueries.getTagsOptions()` — returns `[err, Tag[]]` (for filter comboboxes)
4. For comparison: call `getTransactionsOptions` with comparison period params

**Client-side enrichment:** Build a `Map<productId, Tag[]>` from the products response. For each transaction, look up its product's tags. This gives us `EnrichedTransaction` with full tag data for filtering and grouping.

**Why this works:**
- `ProductWithTags[]` already includes tags via the existing `productRepo.getAll` → `productMappers.mapToProductsWithTags` pipeline.
- TanStack Query caches each month's transactions separately by query key.
- Comparison data is just another `getTransactionsOptions` call with different month/year.
- Over-fetching (all products vs. only products in this month) is negligible for a personal app.

### 3. Key Metrics Cards — 6 Cards

| Card | Value | With Comparison |
|------|-------|-----------------|
| **Total Expenses** | Sum of all expense transactions | Delta arrow + % change |
| **Total Income** | Sum of all income transactions | Delta arrow + % change |
| **Net Balance** | Income - Expenses (green if positive, red if negative) | Delta arrow + % change |
| **Transactions** | Count of all transactions | Delta arrow + absolute change |
| **Daily Average** | Total expenses / days in month | Delta arrow + % change |
| **Biggest Expense** | Largest single expense amount + product name | Show comparison period's biggest |

**Why these 6:**
- Expenses, Income, Net — the three most important financial summary numbers.
- Transaction count — volume indicator, helps spot unusual months.
- Daily average — intuitive budgeting metric ("I spend ~X per day").
- Biggest expense — outlier detection, answers "what was that big charge?"

**Rejected alternatives:**
- "Top tag" — better shown in the donut chart, redundant as a card.
- "Savings rate" (net/income) — derivable from income + net cards, not worth a slot.

### 4. Charts — 3 Charts

#### Chart 1: Daily Spending (Full Width, Bar Chart)
- **X-axis:** Days of the month (1–28/30/31)
- **Y-axis:** Amount in currency
- **Bars:** Stacked — expenses (primary color) and income (secondary color) per day
- **With comparison:** Semi-transparent line overlay showing comparison period's daily expenses
- **Why:** The single most useful chart. Shows spending spikes, quiet periods, payday patterns, end-of-month acceleration.

#### Chart 2: Spending by Tag (Half Width, Donut Chart)
- **Slices:** One per tag, sized by total expense amount for that tag
- **"Untagged" slice:** For transactions whose products have no tags
- **Center text:** Total expenses amount
- **Legend:** Below chart, shows tag name + color + amount
- **Why:** Answers "where does my money go by category?" at a glance.

#### Chart 3: Top Products (Half Width, Horizontal Bar Chart)
- **Bars:** Top 8 products by total expense amount in the **current** period, sorted descending
- **Labels:** Product name on Y-axis, amount on X-axis
- **With comparison:** Grouped bars — current period bar + comparison period bar per product. The product set is fixed to the current period's top 8; comparison amounts are computed for those same products (showing $0 if a product had no transactions in the comparison period). This avoids mismatched bars from differing top-8 sets between periods.
- **Why:** Granular breakdown. Tags show categories, this shows specific items.

**Rejected charts:**
- Income vs Expense comparison bar — already covered by summary cards and the daily chart's stacked bars.
- Monthly trend (multi-month) — out of scope; the page shows one month at a time.

### 5. Comparison Visualization

**When comparison is "nothing":** Only current month data shown. No delta indicators.

**When comparison is "month" or "year":**

| Element | Comparison Treatment |
|---------|---------------------|
| **Summary cards** | Show delta arrow (up/down), percentage change, absolute change. Green = favorable (expenses down, income up, net up). Red = unfavorable. |
| **Daily spending chart** | Overlay: semi-transparent dashed line showing comparison period's daily expenses. Legend distinguishes current vs comparison. |
| **Donut chart** | Legend items show comparison amount as secondary text: "Groceries: $450 (was $380)". |
| **Top products chart** | Grouped horizontal bars: two bars per product (current + comparison), different opacity. |

**Comparison period calculation:**
- `"month"` → previous month: `dayjs(selected).subtract(1, 'month')`
- `"year"` → same month last year: `dayjs(selected).subtract(1, 'year')`

**Month indexing convention (0-indexed throughout):**
- `dayjs().month()` returns 0-indexed values: January = 0, December = 11.
- The `month` URL search param uses the same 0-indexed convention (consistent with dayjs and the existing `MonthSelect` component).
- `transactionQueries.getTransactionsOptions(month, year)` accepts 0-indexed month.
- All month arithmetic must use 0-indexed values. For comparison type `"month"`, the previous month of January (0) is December (11) of the previous year. **dayjs handles this automatically:** `dayjs().year(2026).month(0).subtract(1, 'month')` correctly produces December 2025 (month=11, year=2025). No manual wraparound logic is needed — always use dayjs for month arithmetic.

### 6. Tag Filtering — Local React State

**Decision:** Include/exclude tag selections stay as React `useState`, not URL search params.

**Reasoning:**
- The existing code already uses local state for these filters.
- Serializing UUID arrays in URL params is ugly (`?includeTags=uuid1,uuid2,uuid3`) and fragile.
- These are transient analytical exploration tools, not primary navigation state.
- Month/year in URL = correct (navigation state). Tags in local state = correct (exploration state).
- Page refresh resets to "show all" which is a safe, expected default.

**Filtering semantics:**

| Scenario | Include Tags | Exclude Tags | Behavior |
|----------|-------------|-------------|----------|
| No filters | `[]` | `[]` | All transactions shown |
| Include only | `[A, B]` | `[]` | Only transactions whose product has tag A OR tag B |
| Exclude only | `[]` | `[C]` | All transactions EXCEPT those whose product has tag C |
| Both set | `[A, B]` | `[C]` | Transactions with tag A or B, minus those with tag C |
| Overlap (same tag in both) | `[A]` | `[A]` | **Exclude wins.** Transactions with tag A are excluded. |

**Untagged transaction rules** (product is `null` OR product has zero tags):
- When `includeTags` is non-empty: untagged transactions are **excluded** (they can't match any include tag).
- When only `excludeTags` is set: untagged transactions are **kept** (nothing to match against exclude list).
- When no filters are set: untagged transactions are **kept**.

### 7. Drill-Down — Minimal for V1

**Decision:** Tooltips on hover + one click interaction only.

- **All charts:** Rich tooltips on hover showing details (built into shadcn ChartTooltip).
- **Donut chart:** Click a tag slice → sets that tag as the only include filter, filtering the entire page to show only that tag's data. Click again (or clear filter) to reset.
- **No other click interactions for V1.** No modals, no navigation on chart click, no sidebar panels.

**Why minimal:** Drill-down is complex to implement well. The tag filter + month selector already provide good exploration. The transactions page exists for transaction-level detail. We can add more drill-down later if needed.

### 8. Comparison Selector Placement

**Decision:** Stays in the filter bar at top, next to tag filters.

The comparison type affects the entire page view — it belongs with other page-level filters. The current placement between the tag comboboxes and the page content is correct.

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Analytics                          [< Month Select >]  │
├─────────────────────────────────────────────────────────┤
│  [Include Tags ▼]  [Exclude Tags ▼]  [Compare: None ▼] │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Expenses│ │  Income  │ │   Net   │                   │
│  │ $2,450  │ │  $3,200  │ │  +$750  │                   │
│  │  ↑ 12%  │ │  ↓ 3%   │ │  ↑ 45%  │  (deltas when    │
│  └─────────┘ └─────────┘ └─────────┘   comparison on)  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │  Count  │ │ Avg/Day │ │ Biggest │                   │
│  │   42    │ │  $81.67 │ │  $340   │                   │
│  │  +5     │ │  ↑ 8%   │ │ "Rent"  │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
├─────────────────────────────────────────────────────────┤
│  Daily Spending                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ █                                               │    │
│  │ █ █   █                 █                       │    │
│  │ █ █ █ █   █ █       █ █ █   █               █  │    │
│  │ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █  │    │
│  │ 1 2 3 4 5 6 7 8 9 ...                    30   │    │
│  └─────────────────────────────────────────────────┘    │
├──────────────────────────┬──────────────────────────────┤
│  Spending by Tag         │  Top Products               │
│  ┌──────────────────┐    │  ┌──────────────────────┐   │
│  │    ╭───────╮     │    │  │ Rent      ████████   │   │
│  │   ╱ Food   ╲    │    │  │ Groceries ██████     │   │
│  │  │  35%     │    │    │  │ Electric  ████       │   │
│  │  │  $2,450  │    │    │  │ Gas       ███        │   │
│  │   ╲ Rent   ╱    │    │  │ Netflix   ██         │   │
│  │    ╰───────╯     │    │  │ Coffee    █          │   │
│  │  [legend below]  │    │  │ Phone     █          │   │
│  └──────────────────┘    │  │ Gym       █          │   │
│                          │  └──────────────────────┘   │
└──────────────────────────┴──────────────────────────────┘
```

**Responsive behavior:**
- Desktop (>1024px): Summary cards in 3x2 grid. Bottom charts side-by-side (2 columns).
- Tablet (768-1024px): Summary cards in 3x2 grid. Bottom charts stacked.
- Mobile (<768px): Summary cards in 2x3 or stacked. All charts stacked, full width.

## Architecture

### File Structure

```
src/features/analytics/
├── analytics.utils.ts              # Pure utility functions
├── analytics.types.ts              # TypeScript types
├── hooks/
│   └── use-analytics-data.ts       # Data fetching + computation hook
└── components/
    ├── analytics-content.tsx        # Main orchestrator component
    ├── analytics-filters.tsx        # Filter bar (tags + comparison)
    ├── summary-cards.tsx            # 6 metric cards grid
    ├── summary-card.tsx             # Single metric card with optional delta
    ├── daily-spending-chart.tsx     # Bar chart (full width)
    ├── spending-by-tag-chart.tsx    # Donut chart
    └── top-products-chart.tsx       # Horizontal bar chart
```

**Modified files:**
```
src/routes/_app.dashboard.analytics.tsx   # Simplify: delegate to AnalyticsContent
```

**New shadcn component:**
```
src/components/ui/chart.tsx               # Installed via: npx shadcn@latest add chart
```

### Component Hierarchy

```
_app.dashboard.analytics.tsx (Route)
├── AnalyticsErrorComponent (errorComponent — catches Suspense errors)
└── RouteComponent
    └── Suspense
        └── AnalyticsContent (reads month/year/compare from URL, owns tag filter useState)
            ├── AnalyticsFilters
            │   ├── Combobox (include tags — local state)
            │   ├── Combobox (exclude tags — local state)
            │   └── Select (comparison type — updates URL via navigate)
            ├── SummaryCards
            │   └── SummaryCard (x6)
            ├── DailySpendingChart
            ├── SpendingByTagChart
            └── TopProductsChart
```

## Components

### `analytics.types.ts`

```typescript
import type { Transaction } from "../transactions/transaction.models";
import type { Product } from "../products/product.models";
import type { Tag } from "../tags/tag.models";

// A transaction enriched with its product's tags
export type EnrichedTransaction = {
  transaction: Transaction;
  product: Product | null;
  tags: Tag[];
};

// Computed summary metrics
export type AnalyticsMetrics = {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  transactionCount: number;
  dailyAverage: number;
  biggestExpense: {
    amount: number;
    productName: string;  // "Unknown product" when product is null
  } | null;
};

// Delta between two periods
export type ComparisonDelta = {
  absolute: number;      // current - comparison
  percentage: number;    // ((current - comparison) / comparison) * 100
  direction: "up" | "down" | "neutral";
  favorable: boolean;    // context-dependent: expenses down = favorable
};

export type ComparisonType = "nothing" | "month" | "year";

// Chart data shapes
export type DailyChartDataPoint = {
  day: number;
  expenses: number;
  income: number;
  comparisonExpenses?: number;
};

export type TagChartDataPoint = {
  tagId: string;
  tagName: string;
  tagColor: string;
  amount: number;
  comparisonAmount?: number;
};

export type ProductChartDataPoint = {
  productId: string;
  productName: string;
  amount: number;
  comparisonAmount?: number;
};
```

### `analytics.utils.ts` — Pure Functions

```typescript
// Enrich transactions with tag data from products
enrichTransactionsWithTags(
  transactions: { transaction: Transaction; product: Product | null }[],
  products: ProductWithTags[]
): EnrichedTransaction[]

// Filter by include/exclude tags (client-side)
// Rules:
//   1. If includeTags is empty AND excludeTags is empty → return all transactions
//   2. If includeTags is non-empty → keep only transactions whose product has
//      ANY of the include tags. Untagged transactions (product null or no tags)
//      are EXCLUDED because they can't match.
//   3. If excludeTags is non-empty → remove transactions whose product has
//      ANY of the exclude tags. Untagged transactions are NOT excluded
//      (nothing to match against).
//   4. Exclude wins over include: if same tag appears in both lists,
//      transactions with that tag are excluded.
//   5. Apply exclude filter AFTER include filter.
filterByTags(
  transactions: EnrichedTransaction[],
  includeTags: string[],
  excludeTags: string[]
): EnrichedTransaction[]

// Compute summary metrics from filtered transactions
computeMetrics(
  transactions: EnrichedTransaction[],
  daysInMonth: number
): AnalyticsMetrics

// Compute deltas between two metric sets
// invertFavorable: for expenses, "down" is favorable
computeDelta(
  current: number,
  comparison: number,
  invertFavorable?: boolean
): ComparisonDelta

// Group transactions by day of month for the daily chart.
// Uses dayjs local time for day extraction (dayjs(date).date()),
// consistent with how dates are handled throughout the codebase.
// This avoids UTC midnight boundary issues.
groupByDay(
  transactions: EnrichedTransaction[],
  year: number,
  month: number
): DailyChartDataPoint[]

// Group expense transactions by tag for the donut chart
// Transactions with untagged products go into an "Untagged" slice
groupByTag(transactions: EnrichedTransaction[]): TagChartDataPoint[]

// Get top N products by expense amount for the CURRENT period.
// When comparison transactions are provided, compute comparison amounts
// for the SAME set of products (not the comparison period's own top N).
// Products with $0 in the comparison period get comparisonAmount: 0.
getTopProducts(
  transactions: EnrichedTransaction[],
  comparisonTransactions: EnrichedTransaction[] | null,
  limit: number
): ProductChartDataPoint[]
```

All functions are pure — no side effects, easily unit testable.

### `use-analytics-data.ts` — Custom Hook

```typescript
function useAnalyticsData(params: {
  month: number;          // from URL search params (0-indexed)
  year: number;           // from URL search params
  comparisonType: ComparisonType;  // from URL search params (compare)
  includeTags: string[];  // from local React state
  excludeTags: string[];  // from local React state
}) {
  // 1. Fetch current month transactions (useSuspenseQuery — data prefetched by loader)
  // 2. Fetch products with tags (useSuspenseQuery — data prefetched by loader)
  // 3. Fetch comparison transactions (useQuery, enabled: comparisonType !== "nothing")
  //    Data is prefetched by loader when compare search param is set,
  //    but useQuery handles the case where comparison type changes client-side
  //    before navigation triggers a loader re-run.
  //    - "month" → getTransactionsOptions(prevMonth, prevYear)
  //    - "year"  → getTransactionsOptions(month, year-1)
  //
  // 4. Enrich current transactions with tags (useMemo)
  // 5. Enrich comparison transactions with tags (useMemo)
  // 6. Filter both by include/exclude tags (useMemo)
  // 7. Compute metrics for both (useMemo)
  // 8. Compute chart data — pass comparison transactions to getTopProducts (useMemo)
  // 9. Compute deltas if comparing (useMemo)
  //
  // Returns:
  //   metrics: AnalyticsMetrics
  //   comparisonMetrics: AnalyticsMetrics | null
  //   deltas: { expenses, income, net, count, dailyAvg, biggest } | null
  //   dailyData: DailyChartDataPoint[]
  //   tagData: TagChartDataPoint[]
  //   productData: ProductChartDataPoint[]
  //   isComparing: boolean
  //   isComparisonLoading: boolean
  //   comparisonError: Error | null
}
```

### `analytics-content.tsx`

Orchestrates the full analytics page content below the header.

**State ownership:**
- `includeTags` and `excludeTags` — local React `useState` (transient exploration state, not URL-worthy).
- `compare` — read from URL search params via `Route.useSearch()`. Updated via `useNavigate()` when the user changes the comparison select. This is NOT local state — it lives in the URL because it affects what data the loader prefetches.

Reads `month`, `year`, and `compare` from search params, combines with local tag filter state, passes everything to `useAnalyticsData` hook, then distributes computed data to child chart/card components.

### `analytics-filters.tsx`

Extracted filter bar component. Receives props:
- `includeTags` + `setIncludeTags` — local state, managed by parent
- `excludeTags` + `setExcludeTags` — local state, managed by parent
- `compare` — current value from URL search params
- `onCompareChange` — callback that navigates to update the `compare` search param (e.g., `navigate({ search: (prev) => ({ ...prev, compare: value }) })`)

Contains:
- Include tags combobox (existing pattern from current route code)
- Exclude tags combobox (same pattern)
- Comparison type select — `onValueChange` calls `onCompareChange`, which updates the URL. This triggers the route loader to prefetch comparison data.

### `summary-cards.tsx` + `summary-card.tsx`

Grid container + individual card. Each `SummaryCard` receives:
- `title: string`
- `value: string` (formatted)
- `subtitle?: string` (e.g., product name for "Biggest Expense")
- `delta?: ComparisonDelta` (shown when comparing)
- `icon?: LucideIcon`

Uses existing shadcn `Card` component. Delta shown as colored badge with arrow icon.

### Chart Components

Each chart component receives its pre-computed data array and renders using:
- `ChartContainer` from `@/components/ui/chart`
- `ChartConfig` for theming/colors
- Standard Recharts components (`BarChart`, `PieChart`, `Bar`, `Pie`, `XAxis`, `YAxis`, etc.)
- `ChartTooltip` + `ChartTooltipContent` for hover details

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     URL Search Params                        │
│            month, year, compare (0-indexed month)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Route Loader                          │
│  prefetch: transactions(month, year), products, tags         │
│  prefetch (if compare !== "nothing"):                        │
│    transactions(compMonth, compYear)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    useAnalyticsData Hook                      │
│  Inputs: month, year, compare (from URL)                     │
│          includeTags, excludeTags (from local useState)       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Transactions │  │   Products   │  │   Comparison     │   │
│  │  (current)   │  │  (with tags) │  │   Transactions   │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                     │             │
│         └────────┬───────┘                     │             │
│                  ▼                              │             │
│         enrichTransactionsWithTags              │             │
│                  │                              │             │
│                  ▼                              ▼             │
│           filterByTags ◄────── includeTags/excludeTags       │
│                  │              (local state)   │             │
│         ┌────────┼──────────┐                   │             │
│         ▼        ▼          ▼                   ▼             │
│   computeMetrics  groupByDay  groupByTag   (same pipeline   │
│         │        getTopProducts              for comparison) │
│         ▼                                       │             │
│   computeDeltas(current, comparison) ◄──────────┘             │
└──────────────────────────┬──────────────────────────────────┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
        SummaryCards  DailyChart  TagChart / ProductChart
```

## Route Changes

The analytics route file needs these changes:

1. **Extend `analyticsSearchSchema`** to include comparison type (keeping month/year):
   ```typescript
   const analyticsSearchSchema = z.object({
     month: z.number().optional(),
     year: z.number().optional(),
     compare: z.enum(["nothing", "month", "year"]).optional(),
   });
   ```

2. **Update `loaderDeps`** to include comparison type so the loader re-runs when it changes:
   ```typescript
   loaderDeps: ({ search: { month, year, compare } }) => ({ month, year, compare }),
   ```

3. **Update loader** to prefetch products and conditionally prefetch comparison transactions. Since `compare` is a URL search param and available as a loader dep, the loader handles all prefetching — the hook does not need to trigger its own fetches:
   ```typescript
   loader: async ({ context, deps }) => {
     const { month, year, compare } = deps;

     // Always prefetch: tags, products, current month transactions
     context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
     context.queryClient.prefetchQuery(productQueries.getProductsOptions());
     context.queryClient.prefetchQuery(
       transactionQueries.getTransactionsOptions(month, year)
     );

     // Conditionally prefetch comparison period transactions
     if (compare && compare !== "nothing") {
       const selected = dayjs()
         .year(year ?? dayjs().year())
         .month(month ?? dayjs().month());
       const compDate = compare === "month"
         ? selected.subtract(1, "month")
         : selected.subtract(1, "year");
       context.queryClient.prefetchQuery(
         transactionQueries.getTransactionsOptions(
           compDate.month(),
           compDate.year()
         )
       );
     }
   }
   ```

4. **Add `errorComponent`** for Suspense error boundary:
   ```typescript
   errorComponent: AnalyticsErrorComponent,
   ```

5. **Simplify `RouteComponent`** to delegate to `AnalyticsContent` from the new feature directory.

Note: **State ownership summary:**
- `month`, `year`, `compare` → URL search params. These affect what data is fetched (loader prefetches based on them). Shareable via URL.
- `includeTags`, `excludeTags` → local React `useState` in `AnalyticsContent`. These only filter already-fetched data client-side. Reset to empty on page refresh (safe default: show all).

## Error Handling

The analytics page uses `useSuspenseQuery` for critical data (current transactions, products) and regular `useQuery` for non-critical data (comparison transactions). These have different error handling strategies:

**Critical data — Suspense + Error Boundary:**
- Current month transactions and products are fetched with `useSuspenseQuery`. Errors throw to the nearest error boundary.
- The analytics route defines an `errorComponent` via TanStack Router's route config, which catches these errors and renders a full-page error state: "Failed to load analytics data" with a retry button.
- This is consistent with how Suspense works — errors are structural, not handled inline.

```typescript
export const Route = createFileRoute("/_app/dashboard/analytics")({
  // ...
  errorComponent: AnalyticsErrorComponent,
});
```

**Non-critical data — useQuery + local error state:**
- Comparison transactions are fetched with regular `useQuery` (not Suspense), using `enabled: comparisonType !== "nothing"`.
- If the comparison fetch fails: show current month data normally, hide all comparison deltas and overlays, show a toast notification: "Could not load comparison data."
- The page remains fully functional — comparison is an enhancement, not a requirement.

**Empty state:**
- If no transactions exist in the selected month, show an empty state message instead of empty charts. Use the existing `EmptyState` component pattern.

## New Dependencies

| Package | Purpose | Installation |
|---------|---------|-------------|
| `recharts` | Chart rendering library | Installed automatically by shadcn chart component |

```bash
npx shadcn@latest add chart
```

This creates `src/components/ui/chart.tsx` and adds `recharts` to `package.json`.

No other new dependencies needed.

## Testing Strategy

### Unit Tests (`analytics.utils.test.ts`)
All pure utility functions are testable without React:
- `enrichTransactionsWithTags` — correct tag mapping, handles null products, handles products not in products list
- `filterByTags` — include only, exclude only, both, empty filters, untagged transactions excluded by include, untagged kept by exclude-only, **same tag in include+exclude (exclude wins)**, product-is-null treated as untagged
- `computeMetrics` — correct sums, averages, biggest expense detection, **null product uses "Unknown product" label**, empty transaction list returns zeroes
- `computeDelta` — percentage calculation, direction, favorable flag, division by zero (comparison is 0)
- `groupByDay` — correct day bucketing using local time, handles months with different day counts, days with no transactions get 0
- `groupByTag` — correct tag grouping, untagged bucket, multi-tag transactions counted under each tag
- `getTopProducts` — correct sorting, respects limit, **comparison amounts computed for current period's top N products**, missing comparison products get $0

### Component Tests
- `SummaryCard` — renders value, renders delta when provided, correct colors
- `AnalyticsFilters` — tag selection updates state, comparison select works

### Integration
- Manual testing: verify charts render with real data, comparison overlay works, tag filtering updates all charts simultaneously.

## Open Questions

None — all design decisions have been made. Ready for implementation planning.
