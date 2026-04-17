// src/features/analytics/components/spent-graph.tsx
import {
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import dayjs from "dayjs";
import { ChartArea } from "lucide-react";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import type { SpentGraphProps } from "@/features/analytics/analytics.models";

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

export function SpentGraph({
  chartData,
  hasTransactions,
  month,
  year,
  compareMonth,
  compareYear,
}: SpentGraphProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
        <CardDescription>Your spending pattern</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasTransactions ? (
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
