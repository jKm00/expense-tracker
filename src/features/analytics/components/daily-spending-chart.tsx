import {
  Bar,
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
