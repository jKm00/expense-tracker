import { useMemo, useState, type ComponentType } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CreditCard,
  FilterX,
  Landmark,
  PiggyBank,
  ReceiptText,
  Sparkles,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/utils/format";
import { getDashboardDataOptions } from "../analytics-v2.queries";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";

const moneyFlowConfig = {
  cumulativeIncome: {
    label: "Income",
    color: "#0f9f6e",
  },
  cumulativeExpense: {
    label: "Expense",
    color: "#e11d48",
  },
  cumulativeNetFlow: {
    label: "Net flow",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const barConfig = {
  amount: {
    label: "Amount",
    color: "#2563eb",
  },
  expense: {
    label: "Expense",
    color: "#e11d48",
  },
} satisfies ChartConfig;

const sourceColors: Record<string, string> = {
  recurring: "#0f766e",
  integration: "#2563eb",
  manual: "#7c3aed",
  shopping: "#ca8a04",
  scan: "#db2777",
};

const insightStyles = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
  critical:
    "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100",
  info: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
};

function formatCurrency(value: number, sign = false) {
  return `${formatAmount(value, { decimals: 0, sign })} kr`;
}

function formatPercent(value: number, sign = false) {
  return `${formatAmount(value, { decimals: 1, sign })}%`;
}

function sourceLabel(source: string) {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function ChartKey({ color, label }: { color?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-muted-foreground">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color ?? "#64748b" }}
      />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export function AnalyticsV2Dashboard({
  year,
  month,
}: {
  year?: number;
  month?: number;
}) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { data: result } = useSuspenseQuery(
    getDashboardDataOptions(year, month, selectedTagIds),
  );
  const [error, data] = result;

  const pieData = useMemo(
    () =>
      data?.categoryBreakdown.map((item, index) => ({
        ...item,
        fill: item.color || `var(--chart-${(index % 5) + 1})`,
      })) ?? [],
    [data],
  );

  if (error || !data) {
    let title: string;
    let message: string;

    switch (error.reason) {
      case "ANALYTICS_V2_FORBIDDEN":
        title = "Forbidden";
        message = "You do not have access to this page";
        break;
      case "ANALYTICS_V2_ERROR":
        title = "Error";
        message =
          "Something went wrong getting your insight data. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${error.reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  const hasFilters = selectedTagIds.length > 0;
  const kpis = data.kpis;
  const topCategory = data.categoryBreakdown[0];
  const topStore = data.topStores[0];

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  return (
    <div className="space-y-4 @container">
      <section className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col gap-3 @xl:flex-row @xl:items-start @xl:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="size-4 text-primary" />
                    Money position
                  </CardTitle>
                  <CardDescription>
                    {data.period.label} cashflow, pace, and recurring pressure.
                  </CardDescription>
                </div>
                <Badge
                  variant={kpis.netFlow >= 0 ? "default" : "destructive"}
                  className="w-fit"
                >
                  {kpis.netFlow >= 0
                    ? "Positive cashflow"
                    : "Negative cashflow"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0 @md:grid-cols-2 @3xl:grid-cols-4">
              <KpiTile
                label="Net flow"
                value={formatCurrency(kpis.netFlow)}
                delta={formatCurrency(data.deltas.netFlow, true)}
                intent={kpis.netFlow >= 0 ? "good" : "bad"}
                icon={PiggyBank}
              />
              <KpiTile
                label="Savings rate"
                value={formatPercent(kpis.savingsRate)}
                delta={formatPercent(data.deltas.savingsRate, true)}
                intent={kpis.savingsRate >= 20 ? "good" : "neutral"}
                icon={TrendingUp}
              />
              <KpiTile
                label="Daily spend"
                value={formatCurrency(kpis.averageDailySpend)}
                delta={formatCurrency(data.deltas.dailySpend, true)}
                intent={data.deltas.dailySpend <= 0 ? "good" : "bad"}
                icon={CalendarDays}
              />
              <KpiTile
                label="Projection"
                value={formatCurrency(kpis.projectedExpense)}
                delta={`${formatPercent(kpis.discretionaryShare)} variable`}
                intent={
                  kpis.projectedExpense <= kpis.totalIncome ? "good" : "bad"
                }
                icon={CreditCard}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="size-4 text-primary" />
                    Tag lens
                  </CardTitle>
                  <CardDescription>
                    Focus the whole dashboard on actionable categories.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-fit"
                  disabled={!hasFilters}
                  onClick={() => setSelectedTagIds([])}
                >
                  <FilterX className="size-3.5" />
                  Clear filters
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.availableTags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Add tags to products or entries to unlock category
                    filtering.
                  </span>
                ) : (
                  data.availableTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted",
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                        />
                        <span>{tag.name}</span>
                        <span className="text-[11px] opacity-70">
                          {formatCurrency(tag.amount)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </CardHeader>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Action signals
            </CardTitle>
            <CardDescription>What deserves attention first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.insights.map((insight) => (
              <div
                key={insight.title}
                className={cn(
                  "rounded-md border px-3 py-2.5",
                  insightStyles[insight.severity],
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {insight.severity === "good" ? (
                    <BadgeCheck className="size-3.5" />
                  ) : (
                    <CircleAlert className="size-3.5" />
                  )}
                  {insight.title}
                </div>
                <p className="mt-1 text-xs opacity-80">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 @xl:flex-row @xl:items-start @xl:justify-between">
              <div>
                <CardTitle>Cashflow trend</CardTitle>
                <CardDescription>
                  Cumulative income, expenses, and net movement through the
                  period.
                </CardDescription>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <ChartKey
                  color={moneyFlowConfig.cumulativeIncome.color}
                  label="Income"
                />
                <ChartKey
                  color={moneyFlowConfig.cumulativeExpense.color}
                  label="Expense"
                />
                <ChartKey
                  color={moneyFlowConfig.cumulativeNetFlow.color}
                  label="Net flow"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ChartContainer config={moneyFlowConfig} className="h-full w-full">
              <AreaChart data={data.trends} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={18}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                  fontSize={12}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span className="text-muted-foreground">
                            {moneyFlowConfig[
                              name as keyof typeof moneyFlowConfig
                            ]?.label ?? String(name)}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {formatCurrency(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  verticalAlign="bottom"
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeIncome"
                  stroke="var(--color-cumulativeIncome)"
                  fill="var(--color-cumulativeIncome)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeExpense"
                  stroke="var(--color-cumulativeExpense)"
                  fill="var(--color-cumulativeExpense)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeNetFlow"
                  stroke="var(--color-cumulativeNetFlow)"
                  fill="var(--color-cumulativeNetFlow)"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>
              Category concentration and where the period is being shaped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[240px]">
              <ChartContainer config={barConfig} className="h-full w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => (
                          <span className="font-medium">
                            {formatCurrency(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-2">
              {data.categoryBreakdown.slice(0, 5).map((category) => (
                <RankRow
                  key={category.id}
                  label={category.name}
                  value={formatCurrency(category.amount)}
                  percent={category.percent}
                  color={category.color ?? "#94a3b8"}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
        <PressureCard
          title="Fixed pressure"
          icon={Landmark}
          primary={formatCurrency(kpis.recurringExpense)}
          secondary={`${formatPercent(kpis.fixedCoverageRatio)} of income`}
          caption="Recurring expenses already committed."
        />
        <PressureCard
          title="Flexible spend"
          icon={ChevronDown}
          primary={formatCurrency(kpis.variableExpense)}
          secondary={`${formatPercent(kpis.discretionaryShare)} of expenses`}
          caption="Best area for day-to-day adjustments."
        />
        <PressureCard
          title="Top category"
          icon={Tags}
          primary={topCategory?.name ?? "No expenses"}
          secondary={topCategory ? formatCurrency(topCategory.amount) : "0 kr"}
          caption="The largest category this period."
        />
        <PressureCard
          title="Top merchant"
          icon={ReceiptText}
          primary={topStore?.name ?? "No merchant"}
          secondary={topStore ? formatCurrency(topStore.amount) : "0 kr"}
          caption="The store with the most spend."
        />
      </section>

      <section className="grid gap-4 @3xl:grid-cols-2">
        <BreakdownCard
          title="Merchant leakage"
          description="Stores absorbing the most money."
          rows={data.topStores.map((store) => ({
            id: store.name,
            label: store.name,
            value: formatCurrency(store.amount),
            meta: `${store.count} entries, avg ${formatCurrency(store.average)}`,
            amount: store.amount,
          }))}
        />
        <BreakdownCard
          title="Product drilldown"
          description="Items that create the biggest repeated expense."
          rows={data.topProducts.map((product) => ({
            id: product.id,
            label: product.name,
            value: formatCurrency(product.amount),
            meta: `${product.quantity} units, avg ${formatCurrency(product.average)}`,
            amount: product.amount,
          }))}
        />
      </section>

      <section className="grid items-start gap-4 @3xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Source and weekday patterns</CardTitle>
            <CardDescription>
              See whether spending comes from habits, imports, or specific days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {data.sourceBreakdown.map((source) => (
                <RankRow
                  key={source.source}
                  label={sourceLabel(source.source)}
                  value={formatCurrency(source.amount)}
                  percent={
                    kpis.totalExpense === 0
                      ? 0
                      : (source.amount / kpis.totalExpense) * 100
                  }
                  color={sourceColors[source.source] ?? "#64748b"}
                />
              ))}
            </div>
            <div className="h-[180px]">
              <ChartContainer config={barConfig} className="h-full w-full">
                <BarChart data={data.weekdayBreakdown}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={68}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">
                            {formatCurrency(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--color-amount)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction drilldown</CardTitle>
            <CardDescription>
              Highest-impact transactions, sorted by expense amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactionDrilldown.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No transactions in this view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.transactionDrilldown.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {transaction.date}
                        </TableCell>
                        <TableCell className="min-w-36 font-medium">
                          {transaction.store ??
                            transaction.description ??
                            "Unknown"}
                          {transaction.needsReview ? (
                            <Badge variant="outline" className="ml-2">
                              Review
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-56 flex-wrap gap-1">
                            {transaction.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag.id} variant="secondary">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {transaction.source}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(transaction.expense)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type KpiTileProps = {
  label: string;
  value: string;
  delta: string;
  intent: "good" | "bad" | "neutral";
  icon: ComponentType<{ className?: string }>;
};

function KpiTile({ label, value, delta, intent, icon: Icon }: KpiTileProps) {
  const DeltaIcon = intent === "bad" ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="grid size-6 place-items-center rounded-md">
          <Icon className="size-3 text-primary" />
        </div>
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-1">
        <p className="truncate text-xl font-semibold tracking-tight">{value}</p>
        <div
          className={cn(
            "mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium",
            intent === "good" && "text-income",
            intent === "bad" && "text-expense",
            intent === "neutral" && "text-muted-foreground",
          )}
        >
          <DeltaIcon className="size-3" />
          <span>{delta}</span>
        </div>
      </div>
    </div>
  );
}

function PressureCard({
  title,
  primary,
  secondary,
  caption,
  icon: Icon,
}: {
  title: string;
  primary: string;
  secondary: string;
  caption: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="truncate text-xl font-semibold">{primary}</div>
        <div className="mt-1 text-sm text-muted-foreground">{secondary}</div>
        <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

function RankRow({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate font-medium">{label}</span>
        </div>
        <span className="shrink-0 text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: {
    id: string;
    label: string;
    value: string;
    meta: string;
    amount: number;
  }[];
}) {
  const maxAmount = Math.max(...rows.map((row) => row.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No expense data in this view.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.meta}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold">
                  {row.value}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width:
                      maxAmount === 0
                        ? "0%"
                        : `${(row.amount / maxAmount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
