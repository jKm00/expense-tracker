import { useMemo } from "react";
import { DailyExpensesDataPoint } from "@/features/analytics/analytics.models";
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

type CumulativeSpendingChartProps = {
  dailyData: DailyExpensesDataPoint[];
  isEmpty: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

function formatMoney(value: number) {
  return `${formatAmountNoDecimals(value)} NOK`;
}

export function CumulativeSpendingChart({
  dailyData,
  isEmpty,
  month,
  year,
  compareMonth,
  compareYear,
}: CumulativeSpendingChartProps) {
  const chartData = useMemo(() => {
    let cumulative = 0;
    let comparisonCumulative = 0;
    return dailyData.map((point) => {
      cumulative += point.value;
      comparisonCumulative += point.comparison;
      return {
        day: point.day,
        cumulative,
        comparisonCumulative,
      };
    });
  }, [dailyData]);

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
        {isEmpty ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>
              No cumulative spending data yet. Add a transaction to start tracking
              the curve.
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
                tickFormatter={(value) => formatMoney(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
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
