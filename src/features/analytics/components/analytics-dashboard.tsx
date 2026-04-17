import { useMemo } from "react";
import { FullTransaction } from "@/features/transactions/transactions.models";
import {
  calculateAnalyticsMetrics,
  buildDailyExpensesData,
} from "@/features/analytics/analytics.calculations";
import { HeroKpis } from "./hero-kpis";
import { QuickStats } from "./quick-stats";
import { DetailedKpis } from "./detailed-kpis";
import { DailyActivityChart } from "./daily-activity-chart";
import { CumulativeSpendingChart } from "./cumulative-spending-chart";
import { ExpensesByTagsChart } from "./expenses-by-tags-chart";
import { ExpensesByProductsChart } from "./expenses-by-products-chart";

type AnalyticsDashboardProps = {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function AnalyticsDashboard({
  transactions,
  comparisonTransactions,
  month,
  year,
  compareMonth,
  compareYear,
}: AnalyticsDashboardProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions),
    [transactions],
  );
  const comparisonMetrics = useMemo(
    () => calculateAnalyticsMetrics(comparisonTransactions),
    [comparisonTransactions],
  );
  const dailyChartData = useMemo(
    () => buildDailyExpensesData(transactions, comparisonTransactions, month, year),
    [transactions, comparisonTransactions, month, year],
  );

  return (
    <div className="space-y-6 @container">
      <HeroKpis metrics={metrics} comparisonMetrics={comparisonMetrics} />

      <CumulativeSpendingChart
        dailyData={dailyChartData}
        isEmpty={transactions.length === 0}
        month={month}
        year={year}
        compareMonth={compareMonth}
        compareYear={compareYear}
      />

      <div className="grid gap-6 @xl:grid-cols-[1fr_280px] items-start">
        <DailyActivityChart
          chartData={dailyChartData}
          isEmpty={transactions.length === 0}
          month={month}
          year={year}
          compareMonth={compareMonth}
          compareYear={compareYear}
        />
        <QuickStats metrics={metrics} comparisonMetrics={comparisonMetrics} />
      </div>

      <DetailedKpis
        metrics={metrics}
        comparisonMetrics={comparisonMetrics}
        transactionCount={transactions.length}
        comparisonTransactionCount={comparisonTransactions.length}
      />

      <div className="grid gap-6 @lg:grid-cols-2">
        <ExpensesByTagsChart transactions={transactions} />
        <ExpensesByProductsChart transactions={transactions} />
      </div>
    </div>
  );
}
