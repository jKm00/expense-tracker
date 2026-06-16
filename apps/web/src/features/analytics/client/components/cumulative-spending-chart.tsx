import { useMemo } from "react";
import { DailyExpensesDataPoint } from "@/features/analytics/shared/analytics.models";
import { Area, AreaChart, CartesianGrid } from "recharts";
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
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AnalyticsChartAxes,
  AnalyticsChartEmptyState,
  AnalyticsChartOverlays,
  AnalyticsPeriodFooter,
} from "./analytics-chart-shared";

type CumulativeSpendingChartProps = {
  dailyData: DailyExpensesDataPoint[];
  isEmpty: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

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
          <AnalyticsChartEmptyState message="No cumulative spending data yet. Add a transaction to start tracking the curve." />
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
              <AnalyticsChartAxes yTickLine={true} />
              <AnalyticsChartOverlays />
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
        <AnalyticsPeriodFooter
          label="Cumulative spending"
          year={year}
          month={month}
          compareYear={compareYear}
          compareMonth={compareMonth}
        />
      </CardFooter>
    </Card>
  );
}
