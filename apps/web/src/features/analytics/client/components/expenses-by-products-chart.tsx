import { useMemo } from "react";
import { FullTransaction } from "@/features/transactions/shared/transactions.models";
import { HorizontalExpensesBarChart } from "./horizontal-expenses-bar-chart";
import type { ChartConfig } from "@/components/ui/chart";

type ExpensesByProductsChartProps = {
  transactions: FullTransaction[];
};

export function ExpensesByProductsChart({
  transactions,
}: ExpensesByProductsChartProps) {
  const allData = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        if (entry.type !== "expense") return;
        const amount = Number(entry.price) * entry.quantity;
        const name = entry.products?.name ?? "Unknown";
        totals.set(name, (totals.get(name) ?? 0) + amount);
      });
    });

    return Array.from(totals.entries())
      .map(([product, total]) => ({ product, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const chartConfig = {
    total: {
      label: "Expenses",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <HorizontalExpensesBarChart
      title="Expenses by Product"
      allData={allData}
      dataKey="product"
      chartConfig={chartConfig}
      yAxisWidth={110}
    />
  );
}
