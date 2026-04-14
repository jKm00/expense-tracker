import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { MonthSelect } from "@/components/custom/month-select";
import { Suspense, useMemo, useRef, useState } from "react";
import { CompareSelect } from "@/features/analytics/components/compare.select";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { TagSelect } from "@/features/tags/components/tag.select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Anchor,
  Sparkles,
  Receipt,
  Layers,
  DollarSign,
  ShoppingBag,
  Calendar,
  Activity,
  ChartArea,
  ChevronsUpDown,
  ChevronDown,
  SlidersHorizontal,
  ArrowLeftRight,
  Tags,
  X,
} from "lucide-react";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { FullTransaction } from "@/features/transactions/transactions.models";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import dayjs from "dayjs";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import {
  getComparisonDate,
  filterTransactionsByTags,
  calculateComparisonDelta,
} from "@/features/analytics/analytics.utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/features/tags/components/tag";

const anaylyticsSchema = z.object({
  comparison: z.enum(["year", "month"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year, comparison } }) => ({
    month,
    year,
    comparison,
  }),
  loader: async ({ context, deps }) => {
    context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());

    // Prefetch current month transactions
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.year, deps.month),
    );

    // Prefetch comparison month transactions
    const { compareYear, compareMonth } = getComparisonDate(
      deps.year,
      deps.month,
      deps.comparison,
    );
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(compareYear, compareMonth),
    );
  },
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  const {
    data: [_, tags],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  const allTags = (tags || []).map((tag) => {
    const { products, ...rest } = tag;
    return rest;
  });

  const availableIncludeTags = allTags.filter(
    (tag) => !excludeTags.some((excludeTag) => excludeTag.id === tag.id),
  );

  const availableExcludeTags = allTags.filter(
    (tag) => !includeTags.some((includeTag) => includeTag.id === tag.id),
  );

  const hasActiveTagFilters = includeTags.length > 0 || excludeTags.length > 0;
  const activeFilterCount = includeTags.length + excludeTags.length;

  function clearTagFilters() {
    setIncludeTags([]);
    setExcludeTags([]);
  }

  function removeIncludeTag(tagToRemove: Tag) {
    setIncludeTags((prev) => prev.filter((t) => t.id !== tagToRemove.id));
  }

  function removeExcludeTag(tagToRemove: Tag) {
    setExcludeTags((prev) => prev.filter((t) => t.id !== tagToRemove.id));
  }

  const sheetContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <Sheet>
        <PageHeader>
          <PageHeaderTitle>Analytics</PageHeaderTitle>
          <PageHeaderDescription>
            Insights into your spending habits
          </PageHeaderDescription>
          <PageHeaderActions>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-3.5" />
                Filters
                {hasActiveTagFilters && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 size-5 justify-center px-0"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
          </PageHeaderActions>
        </PageHeader>

        {/* Active filter pills — quick glance + quick removal */}
        {hasActiveTagFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {includeTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => removeIncludeTag(tag)}
                className="group inline-flex items-center gap-1"
              >
                <TagBadge
                  tag={tag}
                  className="cursor-pointer pr-1 transition-opacity group-hover:opacity-70"
                >
                  {tag.name}
                  <X className="size-3" />
                </TagBadge>
              </button>
            ))}
            {excludeTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => removeExcludeTag(tag)}
                className="group inline-flex items-center gap-1"
              >
                <TagBadge
                  tag={tag}
                  className="cursor-pointer pr-1 opacity-60 line-through transition-opacity group-hover:opacity-40"
                >
                  {tag.name}
                  <X className="size-3" />
                </TagBadge>
              </button>
            ))}
            <button
              onClick={clearTagFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filter Sheet — right side on md+, bottom on mobile */}
        <SheetContent
          side="right"
          className="w-[85%] sm:max-w-sm md:max-w-[380px] flex flex-col"
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="sr-only">
              Adjust the filters for the analytics dashboard
            </SheetDescription>
          </SheetHeader>

          <div ref={sheetContentRef} className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
            {/* Date section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Calendar className="size-3.5" />
                Date
              </div>
              <MonthSelect
                from="/_app/dashboard/analytics"
                to="/dashboard/analytics"
              />
            </div>

            <Separator />

            {/* Comparison section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <ArrowLeftRight className="size-3.5" />
                Comparison
              </div>
              <CompareSelect className="w-full" />
            </div>

            <Separator />

            {/* Include tags section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Tags className="size-3.5" />
                Include tags
              </div>
              <TagSelect
                tags={availableIncludeTags}
                value={includeTags}
                onChange={setIncludeTags}
                placeholder="Search tags..."
                className="w-full"
                portalContainer={sheetContentRef}
              />
            </div>

            <Separator />

            {/* Exclude tags section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Tags className="size-3.5" />
                Exclude tags
              </div>
              <TagSelect
                tags={availableExcludeTags}
                value={excludeTags}
                onChange={setExcludeTags}
                placeholder="Search tags..."
                className="w-full"
                portalContainer={sheetContentRef}
              />
            </div>
          </div>
          {hasActiveTagFilters && (
            <SheetFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={clearTagFilters}
              >
                Clear all filters
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Suspense fallback="Loading...">
        <AnalyticsContent includeTags={includeTags} excludeTags={excludeTags} />
      </Suspense>
    </div>
  );
}

function AnalyticsContent({
  includeTags,
  excludeTags,
}: {
  includeTags: Tag[];
  excludeTags: Tag[];
}) {
  const { month, year, comparison } = Route.useSearch();
  const {
    data: [expectedTransactionError, transactions],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(year, month));

  // Fetch comparison month data
  const { compareYear, compareMonth } = getComparisonDate(
    year,
    month,
    comparison,
  );
  const {
    data: [, comparisonTransactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(compareYear, compareMonth),
  );

  const selectedMonth = month || dayjs().month();
  const selectedYear = year || dayjs().year();

  // Apply tag filters to transactions
  const filteredTransactions = useMemo(
    () =>
      filterTransactionsByTags(transactions ?? [], includeTags, excludeTags),
    [transactions, includeTags, excludeTags],
  );

  const filteredComparisonTransactions = useMemo(
    () =>
      filterTransactionsByTags(
        comparisonTransactions ?? [],
        includeTags,
        excludeTags,
      ),
    [comparisonTransactions, includeTags, excludeTags],
  );

  if (unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (expectedTransactionError) {
    let title: string;
    let message: string;

    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the databse. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happend: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-6 @container">
      {/* 1. Hero KPIs — the 3 most important at-a-glance metrics */}
      <HeroKpis
        transactions={filteredTransactions}
        comparisonTransactions={filteredComparisonTransactions}
      />

      {/* 2. Cumulative spending trend — the "story" of the month */}
      <CumulativeSpentGraph
        transactions={filteredTransactions}
        comparisonTransactions={filteredComparisonTransactions}
        month={selectedMonth}
        year={selectedYear}
        compareMonth={compareMonth}
        compareYear={compareYear}
      />

      {/* 3. Daily Activity chart + Quick Stats sidebar */}
      <div className="grid gap-6 @xl:grid-cols-[1fr_280px] items-start">
        <SpentGraph
          transactions={filteredTransactions}
          comparisonTransactions={filteredComparisonTransactions}
          month={selectedMonth}
          year={selectedYear}
          compareMonth={compareMonth}
          compareYear={compareYear}
        />
        <QuickStats
          transactions={filteredTransactions}
          comparisonTransactions={filteredComparisonTransactions}
        />
      </div>

      {/* 4. Collapsible detailed KPIs — all remaining metrics */}
      <DetailedKpis
        transactions={filteredTransactions}
        comparisonTransactions={filteredComparisonTransactions}
      />

      {/* 5. Breakdown charts */}
      <div className="grid gap-6 @lg:grid-cols-2">
        <ExpensesByTagsChart transactions={filteredTransactions} />
        <ExpensesByProductsChart transactions={filteredTransactions} />
      </div>
    </div>
  );
}

function useAnalyticsMetrics(transactions: FullTransaction[]) {
  return useMemo(() => {
    let netBalance = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let fixedIncome = 0;
    let variableIncome = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;
    let largest = 0;
    let totalItems = 0;
    let totalItemValue = 0;
    const activeDays = new Set<number>();

    transactions.forEach((transaction) => {
      const day = dayjs(transaction.date).date();
      activeDays.add(day);

      const isRecurring = transaction.source === "recurring";

      transaction.entries.forEach((entry) => {
        const price = Number(entry.price) * entry.quantity;
        totalItems += entry.quantity;
        totalItemValue += Number(entry.price) * entry.quantity;

        if (entry.type === "expense") {
          netBalance -= price;
          totalExpenses += price;

          if (isRecurring) {
            fixedExpenses += price;
          } else {
            variableExpenses += price;
          }

          if (price > largest) {
            largest = price;
          }
        } else {
          netBalance += price;
          totalIncome += price;

          if (isRecurring) {
            fixedIncome += price;
          } else {
            variableIncome += price;
          }
        }
      });
    });

    const savingsRate =
      totalIncome === 0
        ? 0
        : ((totalIncome - totalExpenses) / totalIncome) * 100;
    const avgItemValue = totalItems === 0 ? 0 : totalItemValue / totalItems;
    const itemsPerTransaction =
      transactions.length === 0 ? 0 : totalItems / transactions.length;
    const dailySpending =
      activeDays.size === 0 ? 0 : totalExpenses / activeDays.size;

    return {
      netBalance,
      totalIncome,
      totalExpenses,
      fixedIncome,
      variableIncome,
      fixedExpenses,
      variableExpenses,
      largest,
      savingsRate,
      transactionCount: transactions.length,
      itemsPerTransaction,
      totalItems,
      avgItemValue,
      dailySpending,
      activeDays: activeDays.size,
    };
  }, [transactions]);
}

const currencyFormatter = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
});

/** Hero section: 3 prominent KPI cards for the most important at-a-glance metrics */
function HeroKpis({
  transactions,
  comparisonTransactions,
}: {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
}) {
  const metrics = useAnalyticsMetrics(transactions);
  const comparisonMetrics = useAnalyticsMetrics(comparisonTransactions);

  const netBalanceDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.netBalance,
        comparisonMetrics.netBalance,
        "up",
      ),
    [metrics.netBalance, comparisonMetrics.netBalance],
  );

  const totalIncomeDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalIncome,
        comparisonMetrics.totalIncome,
        "up",
      ),
    [metrics.totalIncome, comparisonMetrics.totalIncome],
  );

  const totalExpensesDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalExpenses,
        comparisonMetrics.totalExpenses,
        "down",
      ),
    [metrics.totalExpenses, comparisonMetrics.totalExpenses],
  );

  return (
    <section className="grid gap-3 @md:grid-cols-3">
      <KpiCard
        title="Net Balance"
        subtitle="Income minus expenses"
        value={currencyFormatter.format(metrics.netBalance)}
        icon={Scale}
        delta={netBalanceDelta}
      />
      <KpiCard
        title="Total Income"
        subtitle="All money earned"
        value={currencyFormatter.format(metrics.totalIncome)}
        icon={TrendingUp}
        delta={totalIncomeDelta}
      />
      <KpiCard
        title="Total Expenses"
        subtitle="All money spent"
        value={currencyFormatter.format(metrics.totalExpenses)}
        icon={TrendingDown}
        delta={totalExpensesDelta}
      />
    </section>
  );
}

/** Quick stats card shown alongside Daily Activity chart */
function QuickStats({
  transactions,
  comparisonTransactions,
}: {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
}) {
  const metrics = useAnalyticsMetrics(transactions);
  const comparisonMetrics = useAnalyticsMetrics(comparisonTransactions);

  const savingsRateDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.savingsRate,
        comparisonMetrics.savingsRate,
        "up",
      ),
    [metrics.savingsRate, comparisonMetrics.savingsRate],
  );

  const dailySpendingDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.dailySpending,
        comparisonMetrics.dailySpending,
        "down",
      ),
    [metrics.dailySpending, comparisonMetrics.dailySpending],
  );

  const largestDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.largest,
        comparisonMetrics.largest,
        "down",
      ),
    [metrics.largest, comparisonMetrics.largest],
  );

  const activeDaysDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.activeDays,
        comparisonMetrics.activeDays,
        "up",
      ),
    [metrics.activeDays, comparisonMetrics.activeDays],
  );

  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
      <KpiCard
        title="Savings Rate"
        subtitle="Of income saved"
        value={`${metrics.savingsRate.toFixed(1)}%`}
        icon={Percent}
        delta={savingsRateDelta}
      />
      <KpiCard
        title="Daily Spending"
        subtitle="Average per active day"
        value={currencyFormatter.format(metrics.dailySpending)}
        icon={Calendar}
        delta={dailySpendingDelta}
      />
      <KpiCard
        title="Largest Expense"
        subtitle="Single biggest item"
        value={currencyFormatter.format(metrics.largest)}
        icon={TrendingUp}
        delta={largestDelta}
      />
      <KpiCard
        title="Active Days"
        subtitle="Days with transactions"
        value={`${metrics.activeDays}`}
        icon={Activity}
        delta={activeDaysDelta}
      />
    </div>
  );
}

/** Collapsible section with all remaining detailed KPIs */
function DetailedKpis({
  transactions,
  comparisonTransactions,
}: {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const metrics = useAnalyticsMetrics(transactions);
  const comparisonMetrics = useAnalyticsMetrics(comparisonTransactions);

  const fixedIncomeDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.fixedIncome,
        comparisonMetrics.fixedIncome,
        "up",
      ),
    [metrics.fixedIncome, comparisonMetrics.fixedIncome],
  );

  const variableIncomeDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.variableIncome,
        comparisonMetrics.variableIncome,
        "up",
      ),
    [metrics.variableIncome, comparisonMetrics.variableIncome],
  );

  const fixedExpensesDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.fixedExpenses,
        comparisonMetrics.fixedExpenses,
        "down",
      ),
    [metrics.fixedExpenses, comparisonMetrics.fixedExpenses],
  );

  const variableExpensesDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.variableExpenses,
        comparisonMetrics.variableExpenses,
        "down",
      ),
    [metrics.variableExpenses, comparisonMetrics.variableExpenses],
  );

  const avgTransactionDelta = useMemo(
    () =>
      calculateComparisonDelta(
        transactions.length === 0
          ? 0
          : metrics.totalExpenses / transactions.length,
        comparisonTransactions.length === 0
          ? 0
          : comparisonMetrics.totalExpenses / comparisonTransactions.length,
        "down",
      ),
    [
      metrics.totalExpenses,
      transactions.length,
      comparisonMetrics.totalExpenses,
      comparisonTransactions.length,
    ],
  );

  const transactionCountDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.transactionCount,
        comparisonMetrics.transactionCount,
        "down",
      ),
    [metrics.transactionCount, comparisonMetrics.transactionCount],
  );

  const itemsPerTransactionDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.itemsPerTransaction,
        comparisonMetrics.itemsPerTransaction,
        "up",
      ),
    [metrics.itemsPerTransaction, comparisonMetrics.itemsPerTransaction],
  );

  const avgItemValueDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.avgItemValue,
        comparisonMetrics.avgItemValue,
        "down",
      ),
    [metrics.avgItemValue, comparisonMetrics.avgItemValue],
  );

  const totalItemsDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalItems,
        comparisonMetrics.totalItems,
        "down",
      ),
    [metrics.totalItems, comparisonMetrics.totalItems],
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
        />
        Detailed Metrics
        <span className="ml-auto text-xs tabular-nums">9 metrics</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* Fixed vs Variable */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Fixed vs Variable
            </h3>
            <div className="grid gap-2 @sm:grid-cols-2 @lg:grid-cols-4">
              <KpiCard
                title="Fixed Income"
                subtitle="Recurring earnings"
                value={currencyFormatter.format(metrics.fixedIncome)}
                icon={Anchor}
                delta={fixedIncomeDelta}
              />
              <KpiCard
                title="Variable Income"
                subtitle="Irregular earnings"
                value={currencyFormatter.format(metrics.variableIncome)}
                icon={Sparkles}
                delta={variableIncomeDelta}
              />
              <KpiCard
                title="Fixed Expenses"
                subtitle="Recurring costs"
                value={currencyFormatter.format(metrics.fixedExpenses)}
                icon={Anchor}
                delta={fixedExpensesDelta}
              />
              <KpiCard
                title="Variable Expenses"
                subtitle="Irregular costs"
                value={currencyFormatter.format(metrics.variableExpenses)}
                icon={Sparkles}
                delta={variableExpensesDelta}
              />
            </div>
          </div>

          {/* Transaction details */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Transactions & Items
            </h3>
            <div className="grid gap-2 @sm:grid-cols-2 @md:grid-cols-3 @xl:grid-cols-5">
              <KpiCard
                title="Avg Transaction"
                subtitle="Mean transaction size"
                value={currencyFormatter.format(
                  transactions.length === 0
                    ? 0
                    : metrics.totalExpenses / transactions.length,
                )}
                icon={DollarSign}
                delta={avgTransactionDelta}
              />
              <KpiCard
                title="Total Count"
                subtitle="Number of transactions"
                value={`${metrics.transactionCount}`}
                icon={Receipt}
                delta={transactionCountDelta}
              />
              <KpiCard
                title="Items per Tx"
                subtitle="Avg entries per transaction"
                value={metrics.itemsPerTransaction.toFixed(1)}
                icon={Layers}
                delta={itemsPerTransactionDelta}
              />
              <KpiCard
                title="Avg Item Value"
                subtitle="Mean item price"
                value={currencyFormatter.format(metrics.avgItemValue)}
                icon={ShoppingBag}
                delta={avgItemValueDelta}
              />
              <KpiCard
                title="Total Items"
                subtitle="All line items"
                value={`${metrics.totalItems}`}
                icon={Layers}
                delta={totalItemsDelta}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SpentGraph({
  transactions,
  comparisonTransactions,
  month,
  year,
  compareMonth,
  compareYear,
}: {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
}) {
  const chartData = useMemo(() => {
    if (transactions.length === 0 && comparisonTransactions.length === 0)
      return [];

    const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth();

    // Initialize daily expenses map with all days set to 0
    const dailyExpenses = new Map<number, number>();
    const comparisonDailyExpenses = new Map<number, number>();
    for (let i = 1; i <= daysInMonth; i++) {
      dailyExpenses.set(i, 0);
      comparisonDailyExpenses.set(i, 0);
    }

    // Single pass through transactions to accumulate expenses by day
    transactions.forEach((transaction) => {
      const day = dayjs(transaction.date).date();
      const expenseSum = transaction.entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + Number(curr.price), 0);

      dailyExpenses.set(day, (dailyExpenses.get(day) || 0) + expenseSum);
    });

    // Process comparison transactions
    comparisonTransactions.forEach((transaction) => {
      const day = dayjs(transaction.date).date();
      const expenseSum = transaction.entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + Number(curr.price), 0);

      comparisonDailyExpenses.set(
        day,
        (comparisonDailyExpenses.get(day) || 0) + expenseSum,
      );
    });

    // Convert maps to array format for chart
    return Array.from(dailyExpenses, ([day, value]) => ({
      day,
      value,
      comparison: comparisonDailyExpenses.get(day) || 0,
    }));
  }, [transactions, comparisonTransactions, month, year]);

  const chartConfig = {
    value: {
      label: "Current Period",
      color: "var(--chart-2)",
    },
    comparison: {
      label: "Previous Period",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
        <CardDescription>Your spending pattern</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>No data available</EmptyStateMessage>
          </EmptyState>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={3}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="comparison"
                fill="var(--color-comparison)"
                radius={[4, 4, 0, 0]}
                opacity={0.5}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            Daily spending for{" "}
            {dayjs(new Date(year, month)).format("MMMM YYYY")} vs{" "}
            {dayjs(new Date(compareYear, compareMonth)).format("MMMM YYYY")}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

const TOP_LIMIT = 5;

function ExpensesByTagsChart({
  transactions,
}: {
  transactions: FullTransaction[];
}) {
  const [expanded, setExpanded] = useState(false);

  const formatter = new Intl.NumberFormat("no-NB", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  });

  const allData = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        if (entry.type !== "expense") return;
        const amount = Number(entry.price) * entry.quantity;
        const tags = entry.products?.tags ?? [];

        if (tags.length === 0) {
          totals.set("Untagged", (totals.get("Untagged") ?? 0) + amount);
        } else {
          tags.forEach((tag) => {
            totals.set(tag.name, (totals.get(tag.name) ?? 0) + amount);
          });
        }
      });
    });

    return Array.from(totals.entries())
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const chartData = expanded ? allData : allData.slice(0, TOP_LIMIT);
  const hasMore = allData.length > TOP_LIMIT;

  const chartConfig = {
    total: {
      label: "Expenses",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Tag</CardTitle>
        <CardDescription>
          {expanded
            ? `All ${allData.length} tags by spending`
            : `Top ${Math.min(TOP_LIMIT, allData.length)} tags by spending`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allData.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>No data available</EmptyStateMessage>
          </EmptyState>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(200, chartData.length * 40) }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="tag"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={90}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatter.format(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatter.format(Number(value))}
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {hasMore && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            {expanded ? "Show less" : `Show all ${allData.length} tags`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function ExpensesByProductsChart({
  transactions,
}: {
  transactions: FullTransaction[];
}) {
  const [expanded, setExpanded] = useState(false);

  const formatter = new Intl.NumberFormat("no-NB", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  });

  const allData = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        if (entry.type !== "expense") return;
        const amount = Number(entry.price) * entry.quantity;
        const name = entry.products?.name ?? "Unknown";
        totals.set(name, (totals.get(name) ?? 0) + amount);
      });
    });

    return Array.from(totals.entries())
      .map(([product, total]) => ({ product, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const chartData = expanded ? allData : allData.slice(0, TOP_LIMIT);
  const hasMore = allData.length > TOP_LIMIT;

  const chartConfig = {
    total: {
      label: "Expenses",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Product</CardTitle>
        <CardDescription>
          {expanded
            ? `All ${allData.length} products by spending`
            : `Top ${Math.min(TOP_LIMIT, allData.length)} products by spending`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allData.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>No data available</EmptyStateMessage>
          </EmptyState>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(200, chartData.length * 40) }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="product"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={110}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => formatter.format(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatter.format(Number(value))}
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {hasMore && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            {expanded ? "Show less" : `Show all ${allData.length} products`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function CumulativeSpentGraph({
  transactions,
  comparisonTransactions,
  month,
  year,
  compareMonth,
  compareYear,
}: {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
}) {
  const chartData = useMemo(() => {
    if (transactions.length === 0 && comparisonTransactions.length === 0)
      return [];

    const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth();

    // Initialize daily expenses map with all days set to 0
    const dailyExpenses = new Map<number, number>();
    const comparisonDailyExpenses = new Map<number, number>();
    for (let i = 1; i <= daysInMonth; i++) {
      dailyExpenses.set(i, 0);
      comparisonDailyExpenses.set(i, 0);
    }

    // Single pass through transactions to accumulate expenses by day
    transactions.forEach((transaction) => {
      const day = dayjs(transaction.date).date();
      const expenseSum = transaction.entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + Number(curr.price), 0);

      dailyExpenses.set(day, (dailyExpenses.get(day) || 0) + expenseSum);
    });

    // Process comparison transactions
    comparisonTransactions.forEach((transaction) => {
      const day = dayjs(transaction.date).date();
      const expenseSum = transaction.entries
        .filter((e) => e.type === "expense")
        .reduce((acc, curr) => acc + Number(curr.price), 0);

      comparisonDailyExpenses.set(
        day,
        (comparisonDailyExpenses.get(day) || 0) + expenseSum,
      );
    });

    // Convert map to array and calculate cumulative values
    let cumulative = 0;
    let comparisonCumulative = 0;
    return Array.from(dailyExpenses, ([day]) => {
      cumulative += dailyExpenses.get(day) || 0;
      comparisonCumulative += comparisonDailyExpenses.get(day) || 0;
      return {
        day,
        cumulative,
        comparisonCumulative,
      };
    });
  }, [transactions, comparisonTransactions, month, year]);

  const chartConfig = {
    cumulative: {
      label: "Current Period",
      color: "var(--chart-1)",
    },
    comparisonCumulative: {
      label: "Previous Period",
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Spending</CardTitle>
        <CardDescription>Total accumulated expenses over time</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>No data available</EmptyStateMessage>
          </EmptyState>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={true}
                axisLine={false}
                tickMargin={8}
                tickCount={3}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-cumulative)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-cumulative)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id="fillComparisonCumulative"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-comparisonCumulative)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-comparisonCumulative)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="cumulative"
                type="monotone"
                fill="url(#fillCumulative)"
                fillOpacity={0.4}
                stroke="var(--color-cumulative)"
                strokeWidth={2}
              />
              <Area
                dataKey="comparisonCumulative"
                type="monotone"
                fill="url(#fillComparisonCumulative)"
                fillOpacity={0.2}
                stroke="var(--color-comparisonCumulative)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            Cumulative spending for{" "}
            {dayjs(new Date(year, month)).format("MMMM YYYY")} vs{" "}
            {dayjs(new Date(compareYear, compareMonth)).format("MMMM YYYY")}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
