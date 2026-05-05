import { useMemo } from "react";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import {
  calculateAnalyticsMetrics,
  calculateFixedTotalsFromRecurrings,
  calculateFixedTotalsFromTransactions,
  calculateVariableTotals,
  buildDailyExpensesData,
} from "@/features/analytics/analytics.calculations";
import { HeroKpis } from "./hero-kpis";
import { FixedVsVariable } from "./fixed-vs-variable";
import { DetailedKpis } from "./detailed-kpis";
import { DailyActivityChart } from "./daily-activity-chart";
import { CumulativeSpendingChart } from "./cumulative-spending-chart";
import { ExpensesByTagsChart } from "./expenses-by-tags-chart";
import { ExpensesByProductsChart } from "./expenses-by-products-chart";
import { RecurringExpensesChart } from "./recurring-expenses-chart";

type AnalyticsDashboardProps = {
  transactions: FullTransaction[];
  comparisonTransactions: FullTransaction[];
  recurrings: RecurringWithProduct[];
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function AnalyticsDashboard({
  transactions,
  comparisonTransactions,
  recurrings,
  month,
  year,
  compareMonth,
  compareYear,
}: AnalyticsDashboardProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions, month, year),
    [transactions, month, year],
  );
  const comparisonMetrics = useMemo(
    () =>
      calculateAnalyticsMetrics(
        comparisonTransactions,
        compareMonth,
        compareYear,
      ),
    [comparisonTransactions, compareMonth, compareYear],
  );
  const dailyChartData = useMemo(
    () =>
      buildDailyExpensesData(transactions, comparisonTransactions, month, year),
    [transactions, comparisonTransactions, month, year],
  );

  const fixedTotals = useMemo(
    () => calculateFixedTotalsFromRecurrings(recurrings),
    [recurrings],
  );

  const fixedVariableMetrics = useMemo(() => {
    const { variableIncome, variableExpenses } =
      calculateVariableTotals(transactions);
    return {
      fixedIncome: fixedTotals.fixedIncome,
      fixedExpenses: fixedTotals.fixedExpenses,
      variableIncome,
      variableExpenses,
    };
  }, [fixedTotals, transactions]);

  const comparisonFixedVariableMetrics = useMemo(() => {
    const { fixedIncome, fixedExpenses } = calculateFixedTotalsFromTransactions(
      comparisonTransactions,
    );
    const { variableIncome, variableExpenses } = calculateVariableTotals(
      comparisonTransactions,
    );
    return { fixedIncome, fixedExpenses, variableIncome, variableExpenses };
  }, [comparisonTransactions]);

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
        <FixedVsVariable
          metrics={fixedVariableMetrics}
          comparisonMetrics={comparisonFixedVariableMetrics}
        />
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

      <RecurringExpensesChart />
    </div>
  );
}
