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
import { calculateMonthScore } from "@/features/analytics/analytics.score";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { MonthScoreHero } from "./month-score-hero";
import {
  DailyActivityChart,
  type DailyActivityBarSelection,
} from "./daily-activity-chart";
import { CumulativeSpendingChart } from "./cumulative-spending-chart";
import {
  buildExpenseEntries,
  buildProductInsights,
  buildTagInsights,
  type AnalyticsSearchOption,
  type ChartExclusionOption,
  FocusPanel,
  MobileFocusSheet,
  ProductTreemap,
  RecurringSavingsList,
  TagSpendingList,
} from "./analytics-insights";
import { analyticsMutations } from "@/features/analytics/analytics.mutations";
import { AnalyticsPreferences } from "@/features/analytics/analytics.models";
import { useFeatureFlags } from "@/features/feature-flags/feature-flags.provider";
import { ProductWithTag } from "@/features/products/products.models";
import { Tag } from "@/features/tags/tags.models";
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
import { ChevronRight, MousePointerClick, Receipt, X } from "lucide-react";
import { toast } from "sonner";

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
  analyticsPreferences: AnalyticsPreferences | null;
  products: ProductWithTag[];
  tags: Tag[];
  isProductsLoading: boolean;
  isTagsLoading: boolean;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function AnalyticsDashboard({
  transactions,
  comparisonTransactions,
  recurrings,
  analyticsPreferences,
  products,
  tags,
  isProductsLoading,
  isTagsLoading,
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
  const [mobileSearchType, setMobileSearchType] = useState<FocusTarget["type"] | null>(
    null,
  );
  const dailySectionRef = useRef<HTMLDivElement>(null);
  const tagSectionRef = useRef<HTMLDivElement>(null);
  const productSectionRef = useRef<HTMLDivElement>(null);
  const hasActiveDrilldown = focusTarget !== null || dayFocusTarget !== null;
  const updateExclusionsMutation = analyticsMutations.updateExclusions();
  const { scoringSystem } = useFeatureFlags();
  const excludedTagIds = analyticsPreferences?.excludedTagIds ?? [];
  const excludedProductIds = analyticsPreferences?.excludedProductIds ?? [];

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

  const monthScore = useMemo(
    () => {
      if (!scoringSystem) return null;

      return calculateMonthScore({
        metrics,
        comparisonMetrics,
        fixedVariableMetrics,
        comparisonFixedVariableMetrics,
        month,
        year,
        compareMonth,
        compareYear,
      });
    },
    [
      compareMonth,
      compareYear,
      comparisonFixedVariableMetrics,
      comparisonMetrics,
      fixedVariableMetrics,
      metrics,
      month,
      scoringSystem,
      year,
    ],
  );

  const expenseEntries = useMemo(
    () => buildExpenseEntries(transactions),
    [transactions],
  );
  const tagInsights = useMemo(
    () => buildTagInsights(expenseEntries, excludedTagIds),
    [excludedTagIds, expenseEntries],
  );
  const unfilteredTagInsights = useMemo(
    () => buildTagInsights(expenseEntries),
    [expenseEntries],
  );
  const productInsights = useMemo(
    () => buildProductInsights(expenseEntries, excludedProductIds),
    [excludedProductIds, expenseEntries],
  );
  const unfilteredProductInsights = useMemo(
    () => buildProductInsights(expenseEntries),
    [expenseEntries],
  );
  const tagConfigOptions = useMemo(
    () => buildChartExclusionOptions(
      tags,
      unfilteredTagInsights,
      unfilteredTagInsights.some((tag) => tag.id === "untagged")
        ? [{ id: "untagged", name: "Untagged" }]
        : [],
    ),
    [tags, unfilteredTagInsights],
  );
  const tagSearchOptions = useMemo(
    () => buildTagSearchOptions(tags, unfilteredTagInsights),
    [tags, unfilteredTagInsights],
  );
  const productConfigOptions = useMemo(
    () => buildChartExclusionOptions(
      products,
      unfilteredProductInsights,
      unfilteredProductInsights
        .filter((product) => product.id === "unknown")
        .map((product) => ({ id: product.id, name: product.name })),
    ),
    [products, unfilteredProductInsights],
  );
  const productSearchOptions = useMemo(
    () => buildProductSearchOptions(products, unfilteredProductInsights),
    [products, unfilteredProductInsights],
  );
  const hiddenTagCount = excludedTagIds.length;
  const hiddenProductCount = excludedProductIds.length;
  const allTagsHidden = unfilteredTagInsights.length > 0 && tagInsights.length === 0;
  const allProductsHidden =
    unfilteredProductInsights.length > 0 && productInsights.length === 0;

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

  function selectFocusTarget(
    target: FocusTarget,
    options: { source?: "chart" | "search" } = {},
  ) {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches;
    const anchorElement =
      target.type === "tag" ? tagSectionRef.current : productSectionRef.current;
    const restoreAnchor = preserveScrollAnchor(anchorElement);

    setDayFocusTarget(null);
    setFocusTarget(target);
    setMobileSearchType(
      options.source === "search" && !isDesktop ? target.type : null,
    );
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
    setMobileSearchType(null);
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
    setMobileSearchType(null);
    setIsMobileFocusOpen(false);
    restoreAnchor();
  }

  function openMobileSearch(type: FocusTarget["type"]) {
    setDayFocusTarget(null);
    setFocusTarget(null);
    setMobileSearchType(type);
    setIsMobileFocusOpen(true);
  }

  function returnToMobileSearch() {
    setFocusTarget(null);
    setDayFocusTarget(null);
    setIsMobileFocusOpen(true);
  }

  function clearSearchFocus(type: FocusTarget["type"]) {
    if (focusTarget?.type === type) {
      closeFocusTarget();
    }
  }

  function handleMobileFocusOpenChange(open: boolean) {
    if (!open) {
      closeFocusTarget();
      return;
    }

    setIsMobileFocusOpen(true);
  }

  async function saveTagExclusions(ids: string[]) {
    const result = await updateExclusionsMutation.mutateAsync({ type: "tag", ids });
    const [error] = result;
    if (error) {
      toast.error("Could not save tag chart configuration. Please try again.");
      return false;
    }

    if (focusTarget?.type === "tag" && ids.includes(focusTarget.id)) {
      closeFocusTarget();
    }
    return true;
  }

  async function saveProductExclusions(ids: string[]) {
    const result = await updateExclusionsMutation.mutateAsync({
      type: "product",
      ids,
    });
    const [error] = result;
    if (error) {
      toast.error("Could not save product chart configuration. Please try again.");
      return false;
    }

    if (focusTarget?.type === "product" && ids.includes(focusTarget.id)) {
      closeFocusTarget();
    }
    return true;
  }

  return (
    <div className="@container/analytics">
      <div
        className={cn(
          "grid items-start gap-4",
          hasActiveDrilldown
            ? "@5xl/analytics:grid-cols-[minmax(0,1fr)_360px] @7xl/analytics:grid-cols-[minmax(0,1fr)_400px]"
            : "@min-[96rem]/analytics:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        <div className="min-w-0 space-y-4 @container/main">
          {monthScore && (
            <MonthScoreHero
              score={monthScore}
              month={month}
              year={year}
              compareMonth={compareMonth}
              compareYear={compareYear}
            />
          )}

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
              allHidden={allTagsHidden}
              hiddenCount={hiddenTagCount}
              configOptions={tagConfigOptions}
              searchOptions={tagSearchOptions}
              excludedIds={excludedTagIds}
              isSearchLoading={isTagsLoading}
              isSavingExclusions={updateExclusionsMutation.isPending}
              onSaveExclusions={saveTagExclusions}
              selectedTarget={focusTarget}
              onSelect={selectFocusTarget}
              onSearchSelect={(target) =>
                selectFocusTarget(target, { source: "search" })
              }
              onSearchClear={() => clearSearchFocus("tag")}
              onMobileSearchOpen={() => openMobileSearch("tag")}
            />
          </div>

          <div ref={productSectionRef}>
            <ProductTreemap
              products={productInsights}
              allHidden={allProductsHidden}
              hiddenCount={hiddenProductCount}
              configOptions={productConfigOptions}
              searchOptions={productSearchOptions}
              excludedIds={excludedProductIds}
              isSearchLoading={isProductsLoading}
              isSavingExclusions={updateExclusionsMutation.isPending}
              onSaveExclusions={saveProductExclusions}
              selectedTarget={focusTarget}
              onSelect={selectFocusTarget}
              onSearchSelect={(target) =>
                selectFocusTarget(target, { source: "search" })
              }
              onSearchClear={() => clearSearchFocus("product")}
              onMobileSearchOpen={() => openMobileSearch("product")}
            />
          </div>

          <RecurringSavingsList recurrings={recurrings} />
        </div>

        <aside
          className={cn(
            "hidden h-[calc(100svh-3rem)] overflow-y-auto",
            hasActiveDrilldown
              ? "@5xl/analytics:sticky @5xl/analytics:top-6 @5xl/analytics:block"
              : "@min-[96rem]/analytics:sticky @min-[96rem]/analytics:top-6 @min-[96rem]/analytics:block",
          )}
        >
          {dayFocusTarget ? (
            <DayTransactionsPanel
              target={dayFocusTarget}
              transactions={dayTransactions}
              onClose={closeFocusTarget}
            />
          ) : focusTarget ? (
            <FocusPanel
              target={focusTarget}
              entries={expenseEntries}
              onClose={closeFocusTarget}
            />
          ) : (
            <DrilldownEmptyState />
          )}
        </aside>
      </div>

      <MobileFocusSheet
        target={focusTarget}
        entries={expenseEntries}
        searchType={mobileSearchType}
        searchOptions={
          mobileSearchType === "tag" ? tagSearchOptions : productSearchOptions
        }
        isSearchLoading={
          mobileSearchType === "tag" ? isTagsLoading : isProductsLoading
        }
        open={
          isMobileFocusOpen &&
          dayFocusTarget === null &&
          (focusTarget !== null || mobileSearchType !== null)
        }
        onSearchSelect={(target) =>
          selectFocusTarget(target, { source: "search" })
        }
        onReturnToSearch={returnToMobileSearch}
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

function DrilldownEmptyState() {
  return (
    <Card className="h-full overflow-hidden bg-card">
      <CardContent className="flex min-h-full flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-[280px] space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <MousePointerClick className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <CardTitle>Nothing selected</CardTitle>
            <CardDescription>
              Click a daily bar, tag block, or product block to pin its details here.
            </CardDescription>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Details stay visible while you continue scanning the dashboard.
          </div>
        </div>
      </CardContent>
    </Card>
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

function buildChartExclusionOptions(
  catalogItems: Array<{ id: string; name: string }>,
  insights: Array<{ id: string; name: string; total: number; count: number }>,
  syntheticItems: Array<{ id: string; name: string }> = [],
): ChartExclusionOption[] {
  const context = new Map(
    insights.map((item) => [
      item.id,
      {
        total: item.total,
        count: item.count,
      },
    ]),
  );
  const options = new Map<string, ChartExclusionOption>();

  for (const item of [...catalogItems, ...syntheticItems]) {
    options.set(item.id, {
      id: item.id,
      name: item.name,
      ...context.get(item.id),
    });
  }

  for (const item of insights) {
    if (!options.has(item.id)) {
      options.set(item.id, {
        id: item.id,
        name: item.name,
        total: item.total,
        count: item.count,
      });
    }
  }

  return Array.from(options.values()).sort((a, b) => {
    const aHasSpend = a.total !== undefined;
    const bHasSpend = b.total !== undefined;
    if (aHasSpend !== bHasSpend) return aHasSpend ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function buildTagSearchOptions(
  catalogItems: Array<{ id: string; name: string }>,
  insights: Array<{ id: string; name: string; total: number; count: number }>,
): AnalyticsSearchOption[] {
  const context = new Map(insights.map((item) => [item.id, item]));
  const options = new Map<string, AnalyticsSearchOption>();

  for (const item of catalogItems) {
    const insight = context.get(item.id);
    options.set(item.id, {
      type: "tag",
      id: item.id,
      name: item.name,
      total: insight?.total ?? 0,
      count: insight?.count ?? 0,
    });
  }

  const untagged = context.get("untagged");
  if (untagged) {
    options.set("untagged", {
      type: "tag",
      id: untagged.id,
      name: untagged.name,
      total: untagged.total,
      count: untagged.count,
    });
  }

  return Array.from(options.values());
}

function buildProductSearchOptions(
  catalogItems: ProductWithTag[],
  insights: Array<{ id: string; name: string; total: number; count: number }>,
): AnalyticsSearchOption[] {
  const context = new Map(insights.map((item) => [item.id, item]));
  const options = new Map<string, AnalyticsSearchOption>();

  for (const item of catalogItems) {
    const insight = context.get(item.id);
    options.set(item.id, {
      type: "product",
      id: item.id,
      name: item.name,
      total: insight?.total ?? 0,
      count: insight?.count ?? 0,
      aliases: item.aliases.map((alias) => ({
        name: alias.name,
        normalizedName: alias.normalizedName,
      })),
    });
  }

  const unknown = context.get("unknown");
  if (unknown) {
    options.set("unknown", {
      type: "product",
      id: unknown.id,
      name: unknown.name,
      total: unknown.total,
      count: unknown.count,
      aliases: [],
    });
  }

  return Array.from(options.values());
}
