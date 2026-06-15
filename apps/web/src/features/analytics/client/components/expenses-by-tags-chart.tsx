import { useMemo } from "react";
import { FullTransaction } from "@/features/transactions/shared/transactions.models";
import { HorizontalExpensesBarChart } from "./horizontal-expenses-bar-chart";
import type { ChartConfig } from "@/components/ui/chart";
import { getMergedEntryTags } from "@/features/analytics/shared/analytics.utils";

type ExpensesByTagsChartProps = {
  transactions: FullTransaction[];
};

export function ExpensesByTagsChart({ transactions }: ExpensesByTagsChartProps) {
  const allData = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        if (entry.type !== "expense") return;
        const amount = Number(entry.price) * entry.quantity;
        const tags = getMergedEntryTags(entry);

        if (tags.length === 0) {
          totals.set("Untagged", (totals.get("Untagged") ?? 0) + amount);
        } else {
          tags.forEach((tag) => {
            totals.set(tag.name, (totals.get(tag.name) ?? 0) + amount);
          });
        }
      });
    });

    return Array.from(totals.entries())
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const chartConfig = {
    total: {
      label: "Expenses",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <HorizontalExpensesBarChart
      title="Expenses by Tag"
      allData={allData}
      dataKey="tag"
      chartConfig={chartConfig}
      yAxisWidth={90}
    />
  );
}
