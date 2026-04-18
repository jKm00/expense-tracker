import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { HorizontalExpensesBarChart } from "./horizontal-expenses-bar-chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { RecurringWithProduct } from "@/features/recurring/recurring.models";

export function RecurringExpensesChart() {
  const {
    data: [, recurrings],
  } = useSuspenseQuery(recurringQueries.getRecurringsOptions());

  const allData = useMemo(() => {
    if (!recurrings) return [];

    return recurrings
      .filter(
        (r: RecurringWithProduct) => r.isActive && r.type === "expense",
      )
      .map((r: RecurringWithProduct) => ({
        name: r.products?.name ?? "Unknown",
        total: Number(r.price),
      }))
      .sort((a, b) => b.total - a.total);
  }, [recurrings]);

  const chartConfig = {
    total: {
      label: "Recurring Cost",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <HorizontalExpensesBarChart
      title="Recurring Expenses"
      allData={allData}
      dataKey="name"
      chartConfig={chartConfig}
      yAxisWidth={110}
    />
  );
}
