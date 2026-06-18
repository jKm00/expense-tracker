import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import {
  DailyActivityChart,
  type DailyActivityBarSelection,
} from "./daily-activity-chart";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatAmountNoDecimals } from "@/utils/format";
import dayjs from "dayjs";
import { ChevronRight, Receipt, X } from "lucide-react";

type FocusTarget =
  | { type: "tag"; id: string; name: string }
  | { type: "product"; id: string; name: string };

type DayFocusTarget = DailyActivityBarSelection & {
  type: "day";
  month: number;
  year: number;
};

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
  const [dayFocusTarget, setDayFocusTarget] = useState<DayFocusTarget | null>(
    null,
  );
  const [isMobileFocusOpen, setIsMobileFocusOpen] = useState(false);
  const dailySectionRef = useRef<HTMLDivElement>(null);
  const tagSectionRef = useRef<HTMLDivElement>(null);
  const productSectionRef = useRef<HTMLDivElement>(null);
  const hasActiveDrilldown = focusTarget !== null || dayFocusTarget !== null;

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

  const dayTransactions = useMemo(() => {
    if (!dayFocusTarget) return [];

    const sourceTransactions =
      dayFocusTarget.series === "current"
        ? transactions
        : comparisonTransactions;

    return sourceTransactions.filter(
      (transaction) =>
        dayjs(transaction.date).date() === dayFocusTarget.day &&
        transaction.entries.some((entry) => entry.type === "expense"),
    );
  }, [comparisonTransactions, dayFocusTarget, transactions]);

  function preserveScrollAnchor(anchorElement: HTMLElement | null | undefined) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const anchorTop = isDesktop
      ? anchorElement?.getBoundingClientRect().top
      : undefined;

    return () => {
      if (!anchorElement || anchorTop === undefined) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollBy({
            top: anchorElement.getBoundingClientRect().top - anchorTop,
            behavior: "auto",
          });
        });
      });
    };
  }

  function selectFocusTarget(target: FocusTarget) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const anchorElement =
      target.type === "tag" ? tagSectionRef.current : productSectionRef.current;
    const restoreAnchor = preserveScrollAnchor(anchorElement);

    setDayFocusTarget(null);
    setFocusTarget(target);
    if (!isDesktop) {
      setIsMobileFocusOpen(true);
      return;
    }

    restoreAnchor();
  }

  function selectDayFocusTarget(selection: DailyActivityBarSelection) {
    const target = {
      ...selection,
      type: "day" as const,
      month: selection.series === "current" ? month : compareMonth,
      year: selection.series === "current" ? year : compareYear,
    };
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const restoreAnchor = preserveScrollAnchor(dailySectionRef.current);

    setFocusTarget(null);
    setDayFocusTarget(target);
    if (!isDesktop) {
      setIsMobileFocusOpen(true);
      return;
    }

    restoreAnchor();
  }

  function closeFocusTarget() {
    const restoreAnchor = preserveScrollAnchor(
      dayFocusTarget
        ? dailySectionRef.current
        : focusTarget?.type === "tag"
          ? tagSectionRef.current
          : productSectionRef.current,
    );

    setFocusTarget(null);
    setDayFocusTarget(null);
    setIsMobileFocusOpen(false);
    restoreAnchor();
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
          hasActiveDrilldown &&
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

          <div ref={dailySectionRef} className="grid gap-4 @5xl/main:grid-cols-2">
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
              selectedBar={dayFocusTarget}
              onBarSelect={selectDayFocusTarget}
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

        {hasActiveDrilldown && (
          <aside className="hidden h-[calc(100svh-3rem)] overflow-y-auto xl:sticky xl:top-6 xl:block">
            {dayFocusTarget ? (
              <DayTransactionsPanel
                target={dayFocusTarget}
                transactions={dayTransactions}
                onClose={closeFocusTarget}
              />
            ) : (
              <FocusPanel
                target={focusTarget}
                entries={expenseEntries}
                onClose={closeFocusTarget}
              />
            )}
          </aside>
        )}
      </div>

      <MobileFocusSheet
        target={focusTarget}
        entries={expenseEntries}
        open={isMobileFocusOpen && dayFocusTarget === null}
        onOpenChange={handleMobileFocusOpenChange}
      />
      <MobileDayTransactionsSheet
        target={dayFocusTarget}
        transactions={dayTransactions}
        open={isMobileFocusOpen && dayFocusTarget !== null}
        onOpenChange={handleMobileFocusOpenChange}
      />
    </div>
  );
}

function MobileDayTransactionsSheet({
  target,
  transactions,
  open,
  onOpenChange,
}: {
  target: DayFocusTarget | null;
  transactions: FullTransaction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open && !!target} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88svh] overflow-y-auto rounded-t-2xl px-0 pb-4">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle>Daily transactions</SheetTitle>
          <SheetDescription>
            Expense transactions for the selected daily activity bar.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <DayTransactionsPanel target={target} transactions={transactions} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DayTransactionsPanel({
  target,
  transactions,
  onClose,
}: {
  target: DayFocusTarget | null;
  transactions: FullTransaction[];
  onClose?: () => void;
}) {
  if (!target) return null;

  const total = transactions.reduce(
    (sum, transaction) => sum + calculateExpenseSubtotal(transaction),
    0,
  );
  const date = dayjs(new Date(target.year, target.month, target.day));
  const periodLabel = target.series === "current" ? "Current period" : "Previous period";

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{date.format("D MMMM YYYY")}</CardTitle>
            <CardDescription>
              {periodLabel} · {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{formatMoney(total)}</Badge>
            {onClose && (
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
                <span className="sr-only">Close daily transactions</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt}>
            <EmptyStateMessage>
              No expense transactions for this day in the selected period.
            </EmptyStateMessage>
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const expenseEntries = transaction.entries.filter(
                (entry) => entry.type === "expense",
              );
              const expenseSubtotal = calculateExpenseSubtotal(transaction);

              return (
                <Link
                  key={transaction.id}
                  to="/dashboard/transactions/$id"
                  params={{ id: transaction.id }}
                  className="block rounded-lg border bg-background transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                      <Receipt className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {transaction.store || "Transaction"}
                        </p>
                        {transaction.needsReview ? (
                          <Badge variant="outline">Needs review</Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {expenseEntries.length} expense item
                        {expenseEntries.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-expense">
                      {formatMoney(expenseSubtotal)}
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground/40" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateExpenseSubtotal(transaction: FullTransaction) {
  return transaction.entries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + Math.abs(Number(entry.price)) * entry.quantity, 0);
}

function formatMoney(value: number) {
  return `${formatAmountNoDecimals(value)} NOK`;
}
