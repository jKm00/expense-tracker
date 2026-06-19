import { DailyExpensesDataPoint } from "@/features/analytics/analytics.models";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ChartArea, Plus } from "lucide-react";
import dayjs from "dayjs";
import { formatAmountNoDecimals } from "@/utils/format";

type DailyActivityChartProps = {
  chartData: DailyExpensesDataPoint[];
  isEmpty: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
  selectedBar: DailyActivityBarSelection | null;
  onBarSelect: (selection: DailyActivityBarSelection) => void;
};

export type DailyActivityBarSelection = {
  day: number;
  series: "current" | "comparison";
};

function formatMoney(value: number) {
  return `${formatAmountNoDecimals(value)} NOK`;
}

export function DailyActivityChart({
  chartData,
  isEmpty,
  month,
  year,
  compareMonth,
  compareYear,
  selectedBar,
  onBarSelect,
}: DailyActivityChartProps) {
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

  function handleBarClick(
    point: DailyExpensesDataPoint,
    series: DailyActivityBarSelection["series"],
  ) {
    const value = series === "current" ? point.value : point.comparison;
    if (value <= 0) return;

    onBarSelect({ day: point.day, series });
  }

  function getBarStyle(
    point: DailyExpensesDataPoint,
    series: DailyActivityBarSelection["series"],
  ) {
    const hasSelection = selectedBar !== null;
    const isSelected =
      selectedBar?.day === point.day && selectedBar.series === series;
    const value = series === "current" ? point.value : point.comparison;

    return {
      fill:
        hasSelection && !isSelected
          ? "var(--muted-foreground)"
          : series === "current"
            ? "var(--color-value)"
            : "var(--color-comparison)",
      opacity: hasSelection && !isSelected ? 0.22 : series === "current" ? 0.86 : 0.5,
      cursor: value > 0 ? "pointer" : "default",
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
        <CardDescription>Your spending pattern</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>
              No daily activity yet. Add a transaction to see your spending pattern.
            </EmptyStateMessage>
            <EmptyStateAction>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/transactions/new">
                  <Plus className="size-4" />
                  Create transaction
                </Link>
              </Button>
            </EmptyStateAction>
          </EmptyState>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
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
                tickFormatter={(value) => formatMoney(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((point) => {
                  const style = getBarStyle(point, "current");
                  return (
                    <Cell
                      key={`current-${point.day}`}
                      fill={style.fill}
                      opacity={style.opacity}
                      style={{ cursor: style.cursor }}
                      onClick={() => handleBarClick(point, "current")}
                    />
                  );
                })}
              </Bar>
              <Bar
                dataKey="comparison"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((point) => {
                  const style = getBarStyle(point, "comparison");
                  return (
                    <Cell
                      key={`comparison-${point.day}`}
                      fill={style.fill}
                      opacity={style.opacity}
                      style={{ cursor: style.cursor }}
                      onClick={() => handleBarClick(point, "comparison")}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <PeriodLabel
            color="var(--chart-2)"
            label={`Current: ${dayjs(new Date(year, month)).format("MMMM YYYY")}`}
          />
          <PeriodLabel
            color="var(--chart-4)"
            label={`Previous: ${dayjs(new Date(compareYear, compareMonth)).format("MMMM YYYY")}`}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

function PeriodLabel({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 leading-none">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
