import { useMemo, useRef, useState } from "react";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import {
  calculateAnalyticsMetrics,
  calculateFixedTotalsFromRecurrings,
  calculateFixedTotalsFromTransactions,
  calculateVariableTotals,
  buildDailyExpensesData,
} from "@/features/analytics/analytics.calculations";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { DailyActivityChart } from "./daily-activity-chart";
import { CumulativeSpendingChart } from "./cumulative-spending-chart";
import {
  buildExpenseEntries,
  buildProductInsights,
  buildTagInsights,
  FocusPanel,
  MobileFocusSheet,
  ProductTreemap,
  RecurringSavingsList,
  TagSpendingList,
} from "./analytics-insights";
import { cn } from "@/lib/utils";

type FocusTarget =
  | { type: "tag"; id: string; name: string }
  | { type: "product"; id: string; name: string };

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
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [isMobileFocusOpen, setIsMobileFocusOpen] = useState(false);
  const tagSectionRef = useRef<HTMLDivElement>(null);
  const productSectionRef = useRef<HTMLDivElement>(null);

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

  const expenseEntries = useMemo(
    () => buildExpenseEntries(transactions),
    [transactions],
  );
  const tagInsights = useMemo(
    () => buildTagInsights(expenseEntries),
    [expenseEntries],
  );
  const productInsights = useMemo(
    () => buildProductInsights(expenseEntries),
    [expenseEntries],
  );

  function selectFocusTarget(target: FocusTarget) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const anchorElement =
      target.type === "tag" ? tagSectionRef.current : productSectionRef.current;
    const anchorTop = isDesktop
      ? anchorElement?.getBoundingClientRect().top
      : undefined;

    setFocusTarget(target);
    if (!isDesktop) {
      setIsMobileFocusOpen(true);
      return;
    }

    if (anchorElement && anchorTop !== undefined) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollBy({
            top: anchorElement.getBoundingClientRect().top - anchorTop,
            behavior: "auto",
          });
        });
      });
    }
  }

  function closeFocusTarget() {
    setFocusTarget(null);
    setIsMobileFocusOpen(false);
  }

  function handleMobileFocusOpenChange(open: boolean) {
    if (!open) {
      closeFocusTarget();
      return;
    }

    setIsMobileFocusOpen(true);
  }

  return (
    <div className="@container">
      <div
        className={cn(
          "grid items-start gap-4",
          focusTarget &&
            "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        <div className="min-w-0 space-y-4 @container/main">
          <AnalyticsKpiGrid
            metrics={metrics}
            comparisonMetrics={comparisonMetrics}
            fixedVariableMetrics={fixedVariableMetrics}
            comparisonFixedVariableMetrics={comparisonFixedVariableMetrics}
            transactionCount={transactions.length}
            comparisonTransactionCount={comparisonTransactions.length}
          />

          <div className="grid gap-4 @5xl/main:grid-cols-2">
            <CumulativeSpendingChart
              dailyData={dailyChartData}
              isEmpty={transactions.length === 0}
              month={month}
              year={year}
              compareMonth={compareMonth}
              compareYear={compareYear}
            />
            <DailyActivityChart
              chartData={dailyChartData}
              isEmpty={transactions.length === 0}
              month={month}
              year={year}
              compareMonth={compareMonth}
              compareYear={compareYear}
            />
          </div>

          <div ref={tagSectionRef}>
            <TagSpendingList
              tags={tagInsights}
              selectedTarget={focusTarget}
              onSelect={selectFocusTarget}
            />
          </div>

          <div ref={productSectionRef}>
            <ProductTreemap
              products={productInsights}
              selectedTarget={focusTarget}
              onSelect={selectFocusTarget}
            />
          </div>

          <RecurringSavingsList recurrings={recurrings} />
        </div>

        {focusTarget && (
          <aside className="hidden max-h-[calc(100svh-3rem)] overflow-y-auto xl:sticky xl:top-6 xl:block">
            <FocusPanel
              target={focusTarget}
              entries={expenseEntries}
              onClose={closeFocusTarget}
            />
          </aside>
        )}
      </div>

      <MobileFocusSheet
        target={focusTarget}
        entries={expenseEntries}
        open={isMobileFocusOpen}
        onOpenChange={handleMobileFocusOpenChange}
      />
    </div>
  );
}
