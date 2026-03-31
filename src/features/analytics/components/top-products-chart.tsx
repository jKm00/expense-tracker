import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductChartDataPoint } from "../analytics.types";

type TopProductsChartProps = {
  data: ProductChartDataPoint[];
  isComparing: boolean;
};

const chartConfig = {
  amount: {
    label: "Current",
    color: "hsl(var(--chart-1))",
  },
  comparisonAmount: {
    label: "Previous",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function TopProductsChart({
  data,
  isComparing,
}: TopProductsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">No expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            accessibilityLayer
            margin={{ left: 20 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="productName"
              tickLine={false}
              axisLine={false}
              width={100}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {isComparing && (
              <ChartLegend content={<ChartLegendContent />} />
            )}
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[0, 4, 4, 0]}
            />
            {isComparing && (
              <Bar
                dataKey="comparisonAmount"
                fill="var(--color-comparisonAmount)"
                radius={[0, 4, 4, 0]}
                fillOpacity={0.5}
              />
            )}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
