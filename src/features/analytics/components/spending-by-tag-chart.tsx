import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagChartDataPoint } from "../analytics.types";
import { useMemo } from "react";

type SpendingByTagChartProps = {
  data: TagChartDataPoint[];
  comparisonData: TagChartDataPoint[] | null;
  onTagClick?: (tagId: string) => void;
};

export function SpendingByTagChart({
  data,
  comparisonData,
  onTagClick,
}: SpendingByTagChartProps) {
  const totalExpenses = useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0),
    [data],
  );

  // Build a lookup from tagId → comparison amount for the custom legend
  const comparisonMap = useMemo(() => {
    if (!comparisonData) return null;
    const map = new Map<string, number>();
    for (const d of comparisonData) {
      map.set(d.tagId, d.amount);
    }
    return map;
  }, [comparisonData]);

  // Build chart config dynamically from tag data
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const d of data) {
      config[d.tagId] = {
        label: d.tagName,
        color: d.tagColor,
      };
    }
    return config;
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Tag</CardTitle>
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
        <CardTitle>Spending by Tag</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[300px]">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="tagName"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={2}
              onClick={(_, index) => {
                const item = data[index];
                if (item && onTagClick) {
                  onTagClick(item.tagId);
                }
              }}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.tagId}
                  fill={entry.tagColor}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-xl font-bold"
                        >
                          {formatCurrency(totalExpenses)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Custom legend with comparison amounts */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((entry) => {
            const compAmount = comparisonMap?.get(entry.tagId);
            return (
              <div key={entry.tagId} className="flex items-center gap-1.5 text-xs">
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.tagColor }}
                />
                <span>
                  {entry.tagName}: {formatCurrency(entry.amount)}
                  {compAmount !== undefined && (
                    <span className="text-muted-foreground">
                      {" "}(was {formatCurrency(compAmount)})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
