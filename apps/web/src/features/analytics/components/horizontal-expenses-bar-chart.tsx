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
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, ChartArea } from "lucide-react";
import { TOP_LIMIT } from "@/features/analytics/analytics.constants";
import { formatAmountNoDecimals } from "@/utils/format";

type HorizontalExpensesBarChartProps = {
  title: string;
  allData: Array<Record<string, string | number>>;
  dataKey: string;
  chartConfig: ChartConfig;
  yAxisWidth?: number;
};

export function HorizontalExpensesBarChart({
  title,
  allData,
  dataKey,
  chartConfig,
  yAxisWidth = 90,
}: HorizontalExpensesBarChartProps) {
  const [expanded, setExpanded] = useState(false);

  const chartData = expanded ? allData : allData.slice(0, TOP_LIMIT);
  const hasMore = allData.length > TOP_LIMIT;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {expanded
            ? `All ${allData.length} ${dataKey}s by spending`
            : `Top ${Math.min(TOP_LIMIT, allData.length)} ${dataKey}s by spending`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allData.length === 0 ? (
          <EmptyState icon={ChartArea}>
            <EmptyStateMessage>
              No transaction data yet. Add a transaction to start seeing insights
              here.
            </EmptyStateMessage>
            <EmptyStateAction>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/transactions/new">Create transaction</Link>
              </Button>
            </EmptyStateAction>
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
                dataKey={dataKey}
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
                tickFormatter={(v) => formatAmountNoDecimals(v)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatAmountNoDecimals(Number(value))
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
            {expanded ? "Show less" : `Show all ${allData.length} ${dataKey}s`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
