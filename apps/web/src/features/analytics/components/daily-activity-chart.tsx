import { DailyExpensesDataPoint } from "@/features/analytics/analytics.models";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatMoney(Number(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
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
