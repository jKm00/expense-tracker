import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Activity,
  Anchor,
  Calendar,
  ChevronDown,
  DollarSign,
  Layers,
  Percent,
  Receipt,
  Scale,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { AnalyticsMetrics, FixedVariableMetrics } from "@/features/analytics/analytics.models";
import { calculateComparisonDelta } from "@/features/analytics/analytics.utils";
import { formatAmount } from "@/utils/format";
import { cn } from "@/lib/utils";

type AnalyticsKpiGridProps = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics;
  fixedVariableMetrics: FixedVariableMetrics;
  comparisonFixedVariableMetrics: FixedVariableMetrics;
  transactionCount: number;
  comparisonTransactionCount: number;
};

type KpiDefinition = {
  key: string;
  title: string;
  subtitle: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  delta?: ReturnType<typeof calculateComparisonDelta>;
  color?: "default" | "income" | "expense";
  priority?: boolean;
};

function formatMoney(value: number, options?: { sign?: boolean }) {
  return `${formatAmount(value, { decimals: 0, sign: options?.sign })} NOK`;
}

export function AnalyticsKpiGrid({
  metrics,
  comparisonMetrics,
  fixedVariableMetrics,
  comparisonFixedVariableMetrics,
  transactionCount,
  comparisonTransactionCount,
}: AnalyticsKpiGridProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const kpis = useMemo<KpiDefinition[]>(() => {
    const avgTransaction =
      transactionCount === 0 ? 0 : metrics.totalExpenses / transactionCount;
    const comparisonAvgTransaction =
      comparisonTransactionCount === 0
        ? 0
        : comparisonMetrics.totalExpenses / comparisonTransactionCount;

    return [
      {
        key: "net-balance",
        title: "Net Balance",
        subtitle: "Income minus expenses",
        value: formatMoney(metrics.netBalance, { sign: true }),
        icon: Scale,
        delta: calculateComparisonDelta(
          metrics.netBalance,
          comparisonMetrics.netBalance,
          "up",
        ),
        color: metrics.netBalance >= 0 ? "income" : "expense",
        priority: true,
      },
      {
        key: "total-income",
        title: "Total Income",
        subtitle: "All money earned",
        value: formatMoney(metrics.totalIncome),
        icon: TrendingUp,
        delta: calculateComparisonDelta(
          metrics.totalIncome,
          comparisonMetrics.totalIncome,
          "up",
        ),
        color: "income",
      },
      {
        key: "total-expenses",
        title: "Total Expenses",
        subtitle: "All money spent",
        value: formatMoney(metrics.totalExpenses),
        icon: TrendingDown,
        delta: calculateComparisonDelta(
          metrics.totalExpenses,
          comparisonMetrics.totalExpenses,
          "down",
        ),
        color: "expense",
        priority: true,
      },
      {
        key: "savings-rate",
        title: "Savings Rate",
        subtitle: "Of income saved",
        value: `${metrics.savingsRate.toFixed(1)}%`,
        icon: Percent,
        delta: calculateComparisonDelta(
          metrics.savingsRate,
          comparisonMetrics.savingsRate,
          "up",
        ),
      },
      {
        key: "daily-spending",
        title: "Daily Spending",
        subtitle: "Average per calendar day",
        value: formatMoney(metrics.dailySpending),
        icon: Calendar,
        delta: calculateComparisonDelta(
          metrics.dailySpending,
          comparisonMetrics.dailySpending,
          "down",
        ),
        priority: true,
      },
      {
        key: "largest-expense",
        title: "Largest Expense",
        subtitle: "Single biggest item",
        value: formatMoney(metrics.largest),
        icon: TrendingUp,
        delta: calculateComparisonDelta(
          metrics.largest,
          comparisonMetrics.largest,
          "down",
        ),
      },
      {
        key: "fixed-income",
        title: "Fixed Income",
        subtitle: "Recurring earnings",
        value: formatMoney(fixedVariableMetrics.fixedIncome),
        icon: Anchor,
        delta: calculateComparisonDelta(
          fixedVariableMetrics.fixedIncome,
          comparisonFixedVariableMetrics.fixedIncome,
          "up",
        ),
        color: "income",
      },
      {
        key: "variable-income",
        title: "Variable Income",
        subtitle: "Irregular earnings",
        value: formatMoney(fixedVariableMetrics.variableIncome),
        icon: Sparkles,
        delta: calculateComparisonDelta(
          fixedVariableMetrics.variableIncome,
          comparisonFixedVariableMetrics.variableIncome,
          "up",
        ),
        color: "income",
      },
      {
        key: "fixed-expenses",
        title: "Fixed Expenses",
        subtitle: "Recurring costs",
        value: formatMoney(fixedVariableMetrics.fixedExpenses),
        icon: Anchor,
        delta: calculateComparisonDelta(
          fixedVariableMetrics.fixedExpenses,
          comparisonFixedVariableMetrics.fixedExpenses,
          "down",
        ),
        color: "expense",
      },
      {
        key: "variable-expenses",
        title: "Variable Expenses",
        subtitle: "Irregular costs",
        value: formatMoney(fixedVariableMetrics.variableExpenses),
        icon: Sparkles,
        delta: calculateComparisonDelta(
          fixedVariableMetrics.variableExpenses,
          comparisonFixedVariableMetrics.variableExpenses,
          "down",
        ),
        color: "expense",
      },
      {
        key: "active-days",
        title: "Active Days",
        subtitle: "Days with transactions",
        value: `${metrics.activeDays}`,
        icon: Activity,
        delta: calculateComparisonDelta(
          metrics.activeDays,
          comparisonMetrics.activeDays,
          "down",
        ),
      },
      {
        key: "avg-transaction",
        title: "Avg Transaction",
        subtitle: "Mean transaction size",
        value: formatMoney(avgTransaction),
        icon: DollarSign,
        delta: calculateComparisonDelta(
          avgTransaction,
          comparisonAvgTransaction,
          "down",
        ),
      },
      {
        key: "transaction-count",
        title: "Total Count",
        subtitle: "Number of transactions",
        value: `${metrics.transactionCount}`,
        icon: Receipt,
        delta: calculateComparisonDelta(
          metrics.transactionCount,
          comparisonMetrics.transactionCount,
          "down",
        ),
      },
      {
        key: "items-per-tx",
        title: "Items per Tx",
        subtitle: "Avg entries per transaction",
        value: metrics.itemsPerTransaction.toFixed(1),
        icon: Layers,
        delta: calculateComparisonDelta(
          metrics.itemsPerTransaction,
          comparisonMetrics.itemsPerTransaction,
          "up",
        ),
      },
      {
        key: "avg-item-value",
        title: "Avg Item Value",
        subtitle: "Mean item price",
        value: formatMoney(metrics.avgItemValue),
        icon: ShoppingBag,
        delta: calculateComparisonDelta(
          metrics.avgItemValue,
          comparisonMetrics.avgItemValue,
          "down",
        ),
      },
      {
        key: "total-items",
        title: "Total Items",
        subtitle: "All line items",
        value: `${metrics.totalItems}`,
        icon: Layers,
        delta: calculateComparisonDelta(
          metrics.totalItems,
          comparisonMetrics.totalItems,
          "down",
        ),
      },
    ];
  }, [
    comparisonFixedVariableMetrics,
    comparisonMetrics,
    comparisonTransactionCount,
    fixedVariableMetrics,
    metrics,
    transactionCount,
  ]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const visibleKpis = useMemo(() => {
    const isCompact = containerWidth > 0 && containerWidth < 640;
    return isCompact && !showAllMobile
      ? kpis.filter((kpi) => kpi.priority)
      : kpis;
  }, [containerWidth, kpis, showAllMobile]);

  const columnCount = useMemo(
    () => chooseBalancedColumnCount(visibleKpis.length, containerWidth),
    [containerWidth, visibleKpis.length],
  );

  const rows = useMemo(() => {
    return createBalancedRows(visibleKpis, columnCount);
  }, [columnCount, visibleKpis]);

  return (
    <section className="space-y-2">
      <div ref={containerRef} className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((kpi) => (
              <div key={kpi.key} className="min-w-0 flex-1">
                <KpiCard
                  title={kpi.title}
                  subtitle={kpi.subtitle}
                  value={kpi.value}
                  icon={kpi.icon}
                  delta={kpi.delta}
                  color={kpi.color}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-1 sm:hidden"
        onClick={() => setShowAllMobile((value) => !value)}
      >
        {showAllMobile ? "Show fewer metrics" : "Show more metrics"}
        <ChevronDown
          className={cn("size-4 transition-transform", showAllMobile && "rotate-180")}
        />
      </Button>
    </section>
  );
}

function chooseBalancedColumnCount(itemCount: number, width: number) {
  if (itemCount <= 1 || width <= 0) return 1;

  const minCardWidth = 180;
  const gap = 8;
  const maxColumns = Math.max(
    1,
    Math.min(itemCount, Math.floor((width + gap) / (minCardWidth + gap))),
  );

  let bestColumns = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  const desiredMaxRows = width >= 1120 ? 3 : width >= 820 ? 4 : Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= maxColumns; columns++) {
    const rowSizes = getRowSizes(itemCount, columns);
    const imbalance = Math.max(...rowSizes) - Math.min(...rowSizes);
    const rowCount = rowSizes.length;
    const overDesiredRows = rowCount > desiredMaxRows ? 1 : 0;
    const score = overDesiredRows * 100 + imbalance * 4 + rowCount * 3 - columns * 0.1;

    if (score < bestScore) {
      bestScore = score;
      bestColumns = columns;
    }
  }

  return bestColumns;
}

function createBalancedRows<T>(items: T[], maxColumns: number) {
  const rowCount = Math.ceil(items.length / maxColumns);
  const baseRowSize = Math.floor(items.length / rowCount);
  const largerRows = items.length % rowCount;
  const rows: T[][] = [];
  let start = 0;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const size = baseRowSize + (rowIndex < largerRows ? 1 : 0);
    rows.push(items.slice(start, start + size));
    start += size;
  }

  return rows;
}

function getRowSizes(itemCount: number, columns: number) {
  const rows: number[] = [];
  const rowCount = Math.ceil(itemCount / columns);
  const baseRowSize = Math.floor(itemCount / rowCount);
  const largerRows = itemCount % rowCount;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const size = baseRowSize + (rowIndex < largerRows ? 1 : 0);
    rows.push(size);
  }

  return rows;
}
