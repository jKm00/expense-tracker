import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { MonthSelect } from "@/components/custom/month-select";
import { Suspense, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { getComparisonDate, filterTransactionsByTags } from "@/features/analytics/analytics.utils";

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

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Analytics</PageHeaderTitle>
        <PageHeaderDescription>
          Insights into your spending habits
        </PageHeaderDescription>
      </PageHeader>
      {/* Filter */}
      <section className="flex gap-2">
        <div>
          <Label>Date</Label>
          <MonthSelect
            from="/_app/dashboard/analytics"
            to="/dashboard/analytics"
          />
        </div>
        <div>
          <Label>Comparison</Label>
          <CompareSelect />
        </div>
        <div>
          <Label>Including tags</Label>
          <TagSelect
            tags={availableIncludeTags}
            value={includeTags}
            onChange={setIncludeTags}
          />
        </div>
        <div>
          <Label>Excluding tags</Label>
          <TagSelect
            tags={availableExcludeTags}
            value={excludeTags}
            onChange={setExcludeTags}
          />
        </div>
      </section>
      <Suspense fallback="Loading...">
        <AnalyticsContent
          includeTags={includeTags}
          excludeTags={excludeTags}
        />
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
    () => filterTransactionsByTags(transactions ?? [], includeTags, excludeTags),
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
      {/* KPIs */}
      <AnalyticsKpis transactions={filteredTransactions} />
      <SpentGraph
        transactions={filteredTransactions}
        comparisonTransactions={filteredComparisonTransactions}
        month={selectedMonth}
        year={selectedYear}
        compareMonth={compareMonth}
        compareYear={compareYear}
      />
      <CumulativeSpentGraph
        transactions={filteredTransactions}
        comparisonTransactions={filteredComparisonTransactions}
        month={selectedMonth}
        year={selectedYear}
        compareMonth={compareMonth}
        compareYear={compareYear}
      />
    </div>
  );
}

function AnalyticsKpis({ transactions }: { transactions: FullTransaction[] }) {
  const formatter = new Intl.NumberFormat("no-NB", {
    style: "currency",
    currency: "NOK",
  });

  const { netBalance, totalIncome, totalExpenses, largest } = useMemo(() => {
    let netBalance = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let largest = 0;
    
    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        const price = Number(entry.price) * entry.quantity;
        
        if (entry.type === "expense") {
          netBalance -= price;
          totalExpenses += price;
          if (price > largest) {
            largest = price;
          }
        } else {
          netBalance += price;
          totalIncome += price;
        }
      });
    });

    return {
      netBalance,
      totalIncome,
      totalExpenses,
      largest,
    };
  }, [transactions]);

  return (
    <section className="space-y-4">
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Core Financial
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Net Balance"
            subtitle="Income minus expenses"
            value={formatter.format(netBalance)}
            icon={Scale}
          />
        </div>
        <KpiCard
          title="Total Income"
          subtitle="All money earned"
          value={formatter.format(totalIncome)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Expenses"
          subtitle="All money spent"
          value={formatter.format(totalExpenses)}
          icon={TrendingDown}
        />
        <KpiCard
          title="Savings Rate"
          subtitle="Of income saved"
          value="16%"
          icon={Percent}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Fixed vs Variable
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Fixed Income"
            subtitle="Recurring earnings"
            value="30 000,-"
            icon={Anchor}
          />
        </div>
        <KpiCard
          title="Variable Income"
          subtitle="Irregular earnings"
          value="2 000,-"
          icon={Sparkles}
        />
        <KpiCard
          title="Fixed Expenses"
          subtitle="Recurring costs"
          value="5 200 ,-"
          icon={Anchor}
        />
        <KpiCard
          title="Variable Expenses"
          subtitle="Irregular costs"
          value="21 600,-"
          icon={Sparkles}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Transactions
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Avg Transaction"
            subtitle="Mean transaction size"
            value={formatter.format(
              transactions.length === 0
                ? 0
                : totalExpenses / transactions.length,
            )}
            icon={DollarSign}
          />
        </div>
        <KpiCard
          title="Total Count"
          subtitle="Number of transactions"
          value={`${transactions.length}`}
          icon={Receipt}
        />
        <KpiCard
          title="Items per Tx"
          subtitle="Avg entries per transaction"
          value="2.6"
          icon={Layers}
        />
        <KpiCard
          title="Largest Tx"
          subtitle="Biggest transaction"
          value={formatter.format(largest)}
          icon={TrendingUp}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Transaction Items
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Avg Item Value"
            subtitle="Mean item price"
            value="215,-"
            icon={ShoppingBag}
          />
        </div>
        <KpiCard
          title="Total Items"
          subtitle="All line items"
          value="124"
          icon={Layers}
        />
        <KpiCard
          title="Daily Spending"
          subtitle="Average per day"
          value="865,-"
          icon={Calendar}
        />
        <KpiCard
          title="Active Days"
          subtitle="Days with transactions"
          value="23"
          icon={Activity}
        />
      </div>
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
        <CardTitle>Spent Over Time</CardTitle>
        <CardDescription>Your spending pattern</CardDescription>
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
                <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillComparison" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-comparison)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-comparison)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#fillExpenses)"
                fillOpacity={0.4}
                stroke="var(--color-value)"
                strokeWidth={2}
              />
              <Area
                dataKey="comparison"
                type="monotone"
                fill="url(#fillComparison)"
                fillOpacity={0.2}
                stroke="var(--color-comparison)"
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
            Daily spending for{" "}
            {dayjs(new Date(year, month)).format("MMMM YYYY")} vs{" "}
            {dayjs(new Date(compareYear, compareMonth)).format("MMMM YYYY")}
          </div>
        </div>
      </CardFooter>
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
