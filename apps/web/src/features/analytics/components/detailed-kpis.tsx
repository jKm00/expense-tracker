import { useMemo, useState } from "react";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { AnalyticsMetrics } from "@/features/analytics/analytics.models";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import { cn } from "@/lib/utils";
import {
  Percent,
  Calendar,
  TrendingUp,
  Activity,
  DollarSign,
  Receipt,
  Layers,
  ShoppingBag,
  ChevronDown,
} from "lucide-react";

type DetailedKpisProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics;
  transactionCount: number;
  comparisonTransactionCount: number;
};

export function DetailedKpis({
  metrics,
  comparisonMetrics,
  transactionCount,
  comparisonTransactionCount,
}: DetailedKpisProps) {
  const [isOpen, setIsOpen] = useState(false);

  const savingsRateDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.savingsRate,
        comparisonMetrics.savingsRate,
        "up",
      ),
    [metrics.savingsRate, comparisonMetrics.savingsRate],
  );

  const dailySpendingDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.dailySpending,
        comparisonMetrics.dailySpending,
        "down",
      ),
    [metrics.dailySpending, comparisonMetrics.dailySpending],
  );

  const largestDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.largest,
        comparisonMetrics.largest,
        "down",
      ),
    [metrics.largest, comparisonMetrics.largest],
  );

  const activeDaysDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.activeDays,
        comparisonMetrics.activeDays,
        "up",
      ),
    [metrics.activeDays, comparisonMetrics.activeDays],
  );

  const avgTransactionDelta = useMemo(
    () =>
      calculateComparisonDelta(
        transactionCount === 0
          ? 0
          : metrics.totalExpenses / transactionCount,
        comparisonTransactionCount === 0
          ? 0
          : comparisonMetrics.totalExpenses / comparisonTransactionCount,
        "down",
      ),
    [
      metrics.totalExpenses,
      transactionCount,
      comparisonMetrics.totalExpenses,
      comparisonTransactionCount,
    ],
  );

  const transactionCountDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.transactionCount,
        comparisonMetrics.transactionCount,
        "down",
      ),
    [metrics.transactionCount, comparisonMetrics.transactionCount],
  );

  const itemsPerTransactionDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.itemsPerTransaction,
        comparisonMetrics.itemsPerTransaction,
        "up",
      ),
    [metrics.itemsPerTransaction, comparisonMetrics.itemsPerTransaction],
  );

  const avgItemValueDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.avgItemValue,
        comparisonMetrics.avgItemValue,
        "down",
      ),
    [metrics.avgItemValue, comparisonMetrics.avgItemValue],
  );

  const totalItemsDelta = useMemo(
    () =>
      calculateComparisonDelta(
        metrics.totalItems,
        comparisonMetrics.totalItems,
        "down",
      ),
    [metrics.totalItems, comparisonMetrics.totalItems],
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
        />
        Detailed Metrics
        <span className="ml-auto text-xs tabular-nums">9 metrics</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* Spending Overview */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Spending Overview
            </h3>
            <div className="grid gap-2 @sm:grid-cols-2 @lg:grid-cols-4">
              <KpiCard
                title="Savings Rate"
                subtitle="Of income saved"
                value={`${metrics.savingsRate.toFixed(1)}%`}
                icon={Percent}
                delta={savingsRateDelta}
              />
              <KpiCard
                title="Daily Spending"
                subtitle="Average per active day"
                value={currencyFormatter.format(metrics.dailySpending)}
                icon={Calendar}
                delta={dailySpendingDelta}
              />
              <KpiCard
                title="Largest Expense"
                subtitle="Single biggest item"
                value={currencyFormatter.format(metrics.largest)}
                icon={TrendingUp}
                delta={largestDelta}
              />
              <KpiCard
                title="Active Days"
                subtitle="Days with transactions"
                value={`${metrics.activeDays}`}
                icon={Activity}
                delta={activeDaysDelta}
              />
            </div>
          </div>

          {/* Transaction details */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Transactions & Items
            </h3>
            <div className="grid gap-2 @sm:grid-cols-2 @md:grid-cols-3 @xl:grid-cols-5">
              <KpiCard
                title="Avg Transaction"
                subtitle="Mean transaction size"
                value={currencyFormatter.format(
                  transactionCount === 0
                    ? 0
                    : metrics.totalExpenses / transactionCount,
                )}
                icon={DollarSign}
                delta={avgTransactionDelta}
              />
              <KpiCard
                title="Total Count"
                subtitle="Number of transactions"
                value={`${metrics.transactionCount}`}
                icon={Receipt}
                delta={transactionCountDelta}
              />
              <KpiCard
                title="Items per Tx"
                subtitle="Avg entries per transaction"
                value={metrics.itemsPerTransaction.toFixed(1)}
                icon={Layers}
                delta={itemsPerTransactionDelta}
              />
              <KpiCard
                title="Avg Item Value"
                subtitle="Mean item price"
                value={currencyFormatter.format(metrics.avgItemValue)}
                icon={ShoppingBag}
                delta={avgItemValueDelta}
              />
              <KpiCard
                title="Total Items"
                subtitle="All line items"
                value={`${metrics.totalItems}`}
                icon={Layers}
                delta={totalItemsDelta}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
