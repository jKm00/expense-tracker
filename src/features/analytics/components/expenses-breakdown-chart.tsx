// src/features/analytics/components/expenses-breakdown-chart.tsx
import { useState } from "react";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartArea, ChevronsUpDown } from "lucide-react";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { currencyFormatterCompact, BREAKDOWN_TOP_LIMIT } from "@/features/analytics/analytics.constants";
import type { ExpensesBreakdownChartProps } from "@/features/analytics/analytics.models";

export function ExpensesBreakdownChart({
  title,
  description,
  categoryKey,
  data,
  color,
  itemLabel,
  yAxisWidth = 90,
}: ExpensesBreakdownChartProps) {
  const [expanded, setExpanded] = useState(false);

  const chartData = expanded ? data : data.slice(0, BREAKDOWN_TOP_LIMIT);
  const hasMore = data.length > BREAKDOWN_TOP_LIMIT;

  const chartConfig = {
    total: {
      label: "Expenses",
      color,
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {expanded
            ? `All ${data.length} ${itemLabel} by spending`
            : description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>No data available</EmptyStateMessage>
          </EmptyState>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(200, chartData.length * 40) }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey={categoryKey}
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={yAxisWidth}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => currencyFormatterCompact.format(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      currencyFormatterCompact.format(Number(value))
                    }
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {hasMore && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            {expanded ? "Show less" : `Show all ${data.length} ${itemLabel}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
