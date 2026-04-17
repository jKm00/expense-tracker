// src/features/analytics/components/analytics-calculations.tsx
import { useMemo } from "react";
import type { FullTransaction } from "@/features/transactions/transactions.models";
import {
  computeAnalyticsMetrics,
  computeAllDeltas,
  computeDailyChartData,
  computeCumulativeChartData,
  computeTagBreakdownData,
  computeProductBreakdownData,
} from "@/features/analytics/analytics.calculations";
import { BREAKDOWN_TOP_LIMIT } from "@/features/analytics/analytics.constants";
import { HeroKpis } from "./hero-kpis";
import { QuickStats } from "./quick-stats";
import { DetailedKpis } from "./detailed-kpis";
import { SpentGraph } from "./spent-graph";
import { CumulativeSpentGraph } from "./cumulative-spent-graph";
import { ExpensesBreakdownChart } from "./expenses-breakdown-chart";

type AnalyticsCalculationsProps = {
  filteredTransactions: FullTransaction[];
  filteredComparisonTransactions: FullTransaction[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function AnalyticsCalculations({
  filteredTransactions,
  filteredComparisonTransactions,
  month,
  year,
  compareMonth,
  compareYear,
}: AnalyticsCalculationsProps) {
  // ═══════════════════════════════════════════════════════════════════
  // All calculations via pure functions inside useMemo
  // OPTIMIZATION: 6 hook calls → 2 function calls, all deltas computed once
  // ═══════════════════════════════════════════════════════════════════
  const metrics = useMemo(
    () => computeAnalyticsMetrics(filteredTransactions),
    [filteredTransactions],
  );

  const comparisonMetrics = useMemo(
    () => computeAnalyticsMetrics(filteredComparisonTransactions),
    [filteredComparisonTransactions],
  );

  const allDeltas = useMemo(
    () =>
      computeAllDeltas(
        metrics,
        comparisonMetrics,
        filteredTransactions.length,
        filteredComparisonTransactions.length,
      ),
    [metrics, comparisonMetrics, filteredTransactions.length, filteredComparisonTransactions.length],
  );

  // OPTIMIZATION: Daily expenses computed once (was duplicated in 2 charts)
  const dailyChartData = useMemo(
    () =>
      computeDailyChartData(
        filteredTransactions,
        filteredComparisonTransactions,
        month,
        year,
      ),
    [filteredTransactions, filteredComparisonTransactions, month, year],
  );

  // Pre-compute cumulative chart data from daily data
  const cumulativeChartData = useMemo(
    () => computeCumulativeChartData(dailyChartData),
    [dailyChartData],
  );

  // Pre-compute breakdown data
  const tagBreakdownData = useMemo(
    () => computeTagBreakdownData(filteredTransactions),
    [filteredTransactions],
  );

  const productBreakdownData = useMemo(
    () => computeProductBreakdownData(filteredTransactions),
    [filteredTransactions],
  );

  return (
    <div className="space-y-6 @container">
      <HeroKpis
        metrics={metrics}
        deltas={{
          netBalance: allDeltas.netBalance,
          totalIncome: allDeltas.totalIncome,
          totalExpenses: allDeltas.totalExpenses,
        }}
      />

      <CumulativeSpentGraph
        chartData={cumulativeChartData}
        hasTransactions={filteredTransactions.length > 0}
        month={month}
        year={year}
        compareMonth={compareMonth}
        compareYear={compareYear}
      />

      <div className="grid gap-6 @xl:grid-cols-[1fr_280px] items-start">
        <SpentGraph
          chartData={dailyChartData}
          hasTransactions={filteredTransactions.length > 0}
          month={month}
          year={year}
          compareMonth={compareMonth}
          compareYear={compareYear}
        />
        <QuickStats
          metrics={metrics}
          deltas={{
            savingsRate: allDeltas.savingsRate,
            dailySpending: allDeltas.dailySpending,
            largest: allDeltas.largest,
            activeDays: allDeltas.activeDays,
          }}
        />
      </div>

      <DetailedKpis
        metrics={metrics}
        avgTransaction={allDeltas.avgTransactionValue}
        deltas={{
          fixedIncome: allDeltas.fixedIncome,
          variableIncome: allDeltas.variableIncome,
          fixedExpenses: allDeltas.fixedExpenses,
          variableExpenses: allDeltas.variableExpenses,
          avgTransaction: allDeltas.avgTransaction,
          transactionCount: allDeltas.transactionCount,
          itemsPerTransaction: allDeltas.itemsPerTransaction,
          avgItemValue: allDeltas.avgItemValue,
          totalItems: allDeltas.totalItems,
        }}
      />

      <div className="grid gap-6 @lg:grid-cols-2">
        <ExpensesBreakdownChart
          title="Expenses by Tag"
          description={`Top ${Math.min(BREAKDOWN_TOP_LIMIT, tagBreakdownData.length)} tags by spending`}
          categoryKey="tag"
          data={tagBreakdownData}
          color="var(--chart-1)"
          itemLabel="tags"
        />
        <ExpensesBreakdownChart
          title="Expenses by Product"
          description={`Top ${Math.min(BREAKDOWN_TOP_LIMIT, productBreakdownData.length)} products by spending`}
          categoryKey="product"
          data={productBreakdownData}
          color="var(--chart-2)"
          itemLabel="products"
          yAxisWidth={110}
        />
      </div>
    </div>
  );
}
