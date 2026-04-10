# Batch 3: Presentational Components — Cards, Filters, Charts

> **Plan:** Analytics Page
> **Goal:** Implement the analytics page with summary cards, 3 charts, tag filtering, and period comparison.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 7: SummaryCard Component

**Depends on:** Task 2 (types)
**Can parallelize with:** Tasks 8, 9, 10, 11, 12

**Files:**
- Create: `src/features/analytics/components/summary-card.tsx`

### Step 1: Create the SummaryCard component

Create `src/features/analytics/components/summary-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComparisonDelta } from "../analytics.types";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  delta?: ComparisonDelta;
  icon?: LucideIcon;
  showPercentage?: boolean; // defaults to true; set false for count-based metrics
};

export function SummaryCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  showPercentage = true,
}: SummaryCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            {title}
          </CardTitle>
          {Icon && <Icon className="text-muted-foreground size-4" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
        )}
        {delta && <DeltaIndicator delta={delta} showPercentage={showPercentage} />}
      </CardContent>
    </Card>
  );
}

function DeltaIndicator({
  delta,
  showPercentage = true,
}: {
  delta: ComparisonDelta;
  showPercentage?: boolean;
}) {
  const ArrowIcon =
    delta.direction === "up"
      ? ArrowUp
      : delta.direction === "down"
        ? ArrowDown
        : Minus;

  const colorClass = delta.favorable
    ? "text-green-600 dark:text-green-400"
    : delta.direction === "neutral"
      ? "text-muted-foreground"
      : "text-red-600 dark:text-red-400";

  const percentText =
    delta.percentage !== 0
      ? `${delta.percentage > 0 ? "+" : ""}${delta.percentage.toFixed(1)}%`
      : "";

  const absoluteText =
    delta.absolute !== 0
      ? `${delta.absolute > 0 ? "+" : ""}${delta.absolute.toFixed(2)}`
      : "No change";

  return (
    <div className={cn("flex items-center gap-1 text-xs mt-2", colorClass)}>
      <ArrowIcon className="size-3" />
      {showPercentage && percentText && (
        <span className="font-medium">{percentText}</span>
      )}
      <span className="text-muted-foreground">({absoluteText})</span>
    </div>
  );
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
git add src/features/analytics/components/summary-card.tsx
git commit -m "feat(analytics): add SummaryCard component with delta indicator"
```

---

## Task 8: SummaryCards Grid

**Depends on:** Task 2 (types), Task 7 (SummaryCard)
**Can parallelize with:** Tasks 9, 10, 11, 12

**Files:**
- Create: `src/features/analytics/components/summary-cards.tsx`

### Step 1: Create the SummaryCards grid component

This component receives metrics and optional deltas, then renders all 6 cards.

Create `src/features/analytics/components/summary-cards.tsx`:

```tsx
import {
  ArrowDownUp,
  DollarSign,
  Hash,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type {
  AnalyticsMetrics,
  ComparisonDelta,
} from "../analytics.types";
import { SummaryCard } from "./summary-card";

type SummaryCardsProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics | null;
  deltas: {
    expenses: ComparisonDelta;
    income: ComparisonDelta;
    net: ComparisonDelta;
    count: ComparisonDelta;
    dailyAvg: ComparisonDelta;
  } | null;
};

export function SummaryCards({
  metrics,
  comparisonMetrics,
  deltas,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <SummaryCard
        title="Total Expenses"
        value={formatCurrency(metrics.totalExpenses)}
        delta={deltas?.expenses}
        icon={TrendingDown}
      />
      <SummaryCard
        title="Total Income"
        value={formatCurrency(metrics.totalIncome)}
        delta={deltas?.income}
        icon={TrendingUp}
      />
      <SummaryCard
        title="Net Balance"
        value={formatCurrency(metrics.netBalance)}
        delta={deltas?.net}
        icon={Wallet}
      />
      <SummaryCard
        title="Transactions"
        value={metrics.transactionCount.toString()}
        delta={deltas?.count}
        showPercentage={false}
        icon={Hash}
      />
      <SummaryCard
        title="Daily Average"
        value={formatCurrency(metrics.dailyAverage)}
        delta={deltas?.dailyAvg}
        icon={ArrowDownUp}
      />
      <SummaryCard
        title="Biggest Expense"
        value={
          metrics.biggestExpense
            ? formatCurrency(metrics.biggestExpense.amount)
            : "—"
        }
        subtitle={biggestExpenseSubtitle(metrics, comparisonMetrics)}
        icon={DollarSign}
      />
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function biggestExpenseSubtitle(
  metrics: AnalyticsMetrics,
  comparisonMetrics: AnalyticsMetrics | null,
): string {
  if (!metrics.biggestExpense) return "No expenses";

  const currentLabel = metrics.biggestExpense.productName;

  if (!comparisonMetrics?.biggestExpense) return currentLabel;

  return `${currentLabel} (was ${formatCurrency(comparisonMetrics.biggestExpense.amount)} — ${comparisonMetrics.biggestExpense.productName})`;
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
git add src/features/analytics/components/summary-cards.tsx
git commit -m "feat(analytics): add SummaryCards grid component"
```

---

## Task 9: AnalyticsFilters Component

**Depends on:** Task 2 (types)
**Can parallelize with:** Tasks 7, 8, 10, 11, 12

**Files:**
- Create: `src/features/analytics/components/analytics-filters.tsx`

### Step 0: Verify Combobox API

Before implementing, read `src/components/ui/combobox.tsx` to verify the exact prop names and API. The current analytics page at `src/routes/_app.dashboard.analytics.tsx` already has working examples of the Combobox with ComboboxChips — use those as reference. Adjust the props in Step 1 if the actual API differs from what's shown below.

### Step 1: Create the filters component

This component extracts the filter bar from the current route file. It receives tag filter state + handlers as props and comparison state + handler.

Create `src/features/analytics/components/analytics-filters.tsx`:

```tsx
import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FormField } from "@/components/custom/form-field";
import type { Tag } from "@/features/tags/tag.models";
import type { ComparisonType } from "../analytics.types";

type AnalyticsFiltersProps = {
  tags: Tag[];
  includeTags: Tag[];
  excludeTags: Tag[];
  onIncludeTagsChange: (tags: Tag[]) => void;
  onExcludeTagsChange: (tags: Tag[]) => void;
  compare: ComparisonType;
  onCompareChange: (value: ComparisonType) => void;
};

export function AnalyticsFilters({
  tags,
  includeTags,
  excludeTags,
  onIncludeTagsChange,
  onExcludeTagsChange,
  compare,
  onCompareChange,
}: AnalyticsFiltersProps) {
  const includeAnchor = useComboboxAnchor();
  const excludeAnchor = useComboboxAnchor();

  return (
    <div className="flex flex-wrap gap-2">
      <FormField label="Include tags">
        <Combobox
          multiple
          autoHighlight
          items={tags}
          value={includeTags}
          onValueChange={onIncludeTagsChange}
          itemToStringValue={(p: Tag) => p.id}
          itemToStringLabel={(p: Tag) => p.name}
        >
          <ComboboxChips ref={includeAnchor} className="w-full max-w-xs">
            <ComboboxValue placeholder="Include tags">
              {(values) => (
                <React.Fragment>
                  {values.map((tag: Tag) => (
                    <ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput />
                </React.Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={includeAnchor}>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(tag: Tag) => (
                <ComboboxItem key={tag.id} value={tag}>
                  {tag.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FormField>
      <FormField label="Exclude tags">
        <Combobox
          multiple
          autoHighlight
          items={tags}
          value={excludeTags}
          onValueChange={onExcludeTagsChange}
          itemToStringValue={(p: Tag) => p.id}
          itemToStringLabel={(p: Tag) => p.name}
        >
          <ComboboxChips ref={excludeAnchor} className="w-full max-w-xs">
            <ComboboxValue placeholder="Exclude tags">
              {(values) => (
                <React.Fragment>
                  {values.map((tag: Tag) => (
                    <ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput />
                </React.Fragment>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={excludeAnchor}>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(tag: Tag) => (
                <ComboboxItem key={tag.id} value={tag}>
                  {tag.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FormField>
      <FormField label="Compare">
        <Select
          value={compare}
          onValueChange={(v) => onCompareChange(v as ComparisonType)}
        >
          <SelectTrigger className="w-full min-w-40 max-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Compare types</SelectLabel>
              <SelectItem value="nothing">No comparison</SelectItem>
              <SelectItem value="month">Last month</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
```

**Key differences from the current inline implementation:**
- Uses controlled `value` and `onValueChange` props instead of `defaultValue` for the Combobox components (parent owns state)
- Comparison select uses `compare` prop from URL and `onCompareChange` callback
- Exclude tags placeholder fixed from "Include tags" to "Exclude tags"

> **Note on Combobox API:** Check the actual Combobox component's API in `src/components/ui/combobox.tsx`. If it uses `value`/`onValueChange` for controlled mode, use that. If it uses a different prop name (e.g., `selectedValues`/`onSelectionChange`), adjust accordingly. The existing route uses `defaultValue={[]}` (uncontrolled) — we need controlled mode so the parent can manage state.

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors.

### Step 3: Commit

```bash
git add src/features/analytics/components/analytics-filters.tsx
git commit -m "feat(analytics): add AnalyticsFilters component"
```

---

## Task 10: DailySpendingChart

**Depends on:** Task 1 (chart.tsx installed), Task 2 (types)
**Can parallelize with:** Tasks 7, 8, 9, 11, 12

**Files:**
- Create: `src/features/analytics/components/daily-spending-chart.tsx`

### Step 1: Create the daily spending bar chart

This chart shows expenses and income per day, with an optional comparison overlay line.

Create `src/features/analytics/components/daily-spending-chart.tsx`:

```tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyChartDataPoint } from "../analytics.types";

type DailySpendingChartProps = {
  data: DailyChartDataPoint[];
  comparisonData: DailyChartDataPoint[] | null;
  isComparing: boolean;
};

const chartConfig = {
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-1))",
  },
  income: {
    label: "Income",
    color: "hsl(var(--chart-2))",
  },
  comparisonExpenses: {
    label: "Prev. Expenses",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function DailySpendingChart({
  data,
  comparisonData,
  isComparing,
}: DailySpendingChartProps) {
  // Merge comparison data into the main data array if comparing
  const chartData = isComparing && comparisonData
    ? data.map((d, i) => ({
        ...d,
        comparisonExpenses: comparisonData[i]?.expenses ?? 0,
      }))
    : data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="expenses"
              fill="var(--color-expenses)"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            {isComparing && (
              <Line
                dataKey="comparisonExpenses"
                stroke="var(--color-comparisonExpenses)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                type="monotone"
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

**Implementation notes:**
- Uses `ComposedChart` instead of plain `BarChart` because we need both Bar and Line in the same chart (for comparison overlay).
- The comparison line is dashed (`strokeDasharray="5 5"`) and uses `--chart-3` color.
- Data merging: comparison expenses are added to each data point by index (day 1 → index 0, etc.). If comparison month has fewer days, missing days get 0.

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors.

### Step 3: Commit

```bash
git add src/features/analytics/components/daily-spending-chart.tsx
git commit -m "feat(analytics): add DailySpendingChart component with comparison overlay"
```

---

## Task 11: SpendingByTagChart

**Depends on:** Task 1 (chart.tsx installed), Task 2 (types)
**Can parallelize with:** Tasks 7, 8, 9, 10, 12

**Files:**
- Create: `src/features/analytics/components/spending-by-tag-chart.tsx`

### Step 1: Create the spending by tag donut chart

Create `src/features/analytics/components/spending-by-tag-chart.tsx`:

```tsx
import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagChartDataPoint } from "../analytics.types";
import { useMemo } from "react";

type SpendingByTagChartProps = {
  data: TagChartDataPoint[];
  comparisonData: TagChartDataPoint[] | null;
  onTagClick?: (tagId: string) => void;
};

export function SpendingByTagChart({
  data,
  comparisonData,
  onTagClick,
}: SpendingByTagChartProps) {
  const totalExpenses = useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0),
    [data],
  );

  // Build a lookup from tagId → comparison amount for the custom legend
  const comparisonMap = useMemo(() => {
    if (!comparisonData) return null;
    const map = new Map<string, number>();
    for (const d of comparisonData) {
      map.set(d.tagId, d.amount);
    }
    return map;
  }, [comparisonData]);

  // Build chart config dynamically from tag data
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const d of data) {
      config[d.tagId] = {
        label: d.tagName,
        color: d.tagColor,
      };
    }
    return config;
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Tag</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">No expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Tag</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[300px]">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="tagName"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
              onClick={(_, index) => {
                const item = data[index];
                if (item && onTagClick) {
                  onTagClick(item.tagId);
                }
              }}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.tagId}
                  fill={entry.tagColor}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-xl font-bold"
                        >
                          {formatCurrency(totalExpenses)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Custom legend with comparison amounts */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((entry) => {
            const compAmount = comparisonMap?.get(entry.tagId);
            return (
              <div key={entry.tagId} className="flex items-center gap-1.5 text-xs">
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.tagColor }}
                />
                <span>
                  {entry.tagName}: {formatCurrency(entry.amount)}
                  {compAmount !== undefined && (
                    <span className="text-muted-foreground">
                      {" "}(was {formatCurrency(compAmount)})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
```

**Implementation notes:**
- Uses `Pie` with `innerRadius` for donut effect.
- Center label shows total expenses.
- `Cell` components with dynamic `fill` from tag colors.
- `onClick` on Pie triggers `onTagClick` to set the clicked tag as the include filter (drill-down per design).
- Custom legend shows comparison amounts as "(was $X)" secondary text per the design spec.
- Uses a `comparisonMap` lookup to match current tags to their comparison amounts by `tagId`.

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors.

### Step 3: Commit

```bash
git add src/features/analytics/components/spending-by-tag-chart.tsx
git commit -m "feat(analytics): add SpendingByTagChart donut component"
```

---

## Task 12: TopProductsChart

**Depends on:** Task 1 (chart.tsx installed), Task 2 (types)
**Can parallelize with:** Tasks 7, 8, 9, 10, 11

**Files:**
- Create: `src/features/analytics/components/top-products-chart.tsx`

### Step 1: Create the top products horizontal bar chart

Create `src/features/analytics/components/top-products-chart.tsx`:

```tsx
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductChartDataPoint } from "../analytics.types";

type TopProductsChartProps = {
  data: ProductChartDataPoint[];
  isComparing: boolean;
};

const chartConfig = {
  amount: {
    label: "Current",
    color: "hsl(var(--chart-1))",
  },
  comparisonAmount: {
    label: "Previous",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function TopProductsChart({
  data,
  isComparing,
}: TopProductsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">No expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            accessibilityLayer
            margin={{ left: 20 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="productName"
              tickLine={false}
              axisLine={false}
              width={100}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {isComparing && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[0, 4, 4, 0]}
            />
            {isComparing && (
              <Bar
                dataKey="comparisonAmount"
                fill="var(--color-comparisonAmount)"
                radius={[0, 4, 4, 0]}
                fillOpacity={0.5}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

**Implementation notes:**
- Uses `layout="vertical"` for horizontal bars (product names on Y-axis, amounts on X-axis).
- When comparing, shows two grouped bars per product (current + comparison) with different colors/opacity.
- Legend only shown when comparing (otherwise there's only one bar series).

### Step 2: Verify TypeScript compiles

Run:

```bash
npx tsc --noEmit
```

Expected: No new type errors.

### Step 3: Commit

```bash
git add src/features/analytics/components/top-products-chart.tsx
git commit -m "feat(analytics): add TopProductsChart horizontal bar component"
```
