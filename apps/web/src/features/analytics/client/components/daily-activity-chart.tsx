import { DailyExpensesDataPoint } from "@/features/analytics/shared/analytics.models";
import { Bar, BarChart, CartesianGrid } from "recharts";
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

type DailyActivityChartProps = {
  chartData: DailyExpensesDataPoint[];
  isEmpty: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function DailyActivityChart({
  chartData,
  isEmpty,
  month,
  year,
  compareMonth,
  compareYear,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
        <CardDescription>Your spending pattern</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <AnalyticsChartEmptyState message="No daily activity yet. Add a transaction to see your spending pattern." />
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
              <AnalyticsChartAxes yTickLine={false} />
              <AnalyticsChartOverlays />
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
        <AnalyticsPeriodFooter
          label="Daily spending"
          year={year}
          month={month}
          compareYear={compareYear}
          compareMonth={compareMonth}
        />
      </CardFooter>
    </Card>
  );
}
