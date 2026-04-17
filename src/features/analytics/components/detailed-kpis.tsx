// src/features/analytics/components/detailed-kpis.tsx
import { useState } from "react";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import {
  Anchor,
  Sparkles,
  DollarSign,
  Receipt,
  Layers,
  ShoppingBag,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { currencyFormatter } from "@/features/analytics/analytics.constants";
import type { DetailedKpisProps } from "@/features/analytics/analytics.models";

export function DetailedKpis({
  metrics,
  avgTransaction,
  deltas,
}: DetailedKpisProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          {/* Fixed vs Variable */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Fixed vs Variable
            </h3>
            <div className="grid gap-2 @sm:grid-cols-2 @lg:grid-cols-4">
              <KpiCard
                title="Fixed Income"
                subtitle="Recurring earnings"
                value={currencyFormatter.format(metrics.fixedIncome)}
                icon={Anchor}
                delta={deltas.fixedIncome}
              />
              <KpiCard
                title="Variable Income"
                subtitle="Irregular earnings"
                value={currencyFormatter.format(metrics.variableIncome)}
                icon={Sparkles}
                delta={deltas.variableIncome}
              />
              <KpiCard
                title="Fixed Expenses"
                subtitle="Recurring costs"
                value={currencyFormatter.format(metrics.fixedExpenses)}
                icon={Anchor}
                delta={deltas.fixedExpenses}
              />
              <KpiCard
                title="Variable Expenses"
                subtitle="Irregular costs"
                value={currencyFormatter.format(metrics.variableExpenses)}
                icon={Sparkles}
                delta={deltas.variableExpenses}
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
                value={currencyFormatter.format(avgTransaction)}
                icon={DollarSign}
                delta={deltas.avgTransaction}
              />
              <KpiCard
                title="Total Count"
                subtitle="Number of transactions"
                value={`${metrics.transactionCount}`}
                icon={Receipt}
                delta={deltas.transactionCount}
              />
              <KpiCard
                title="Items per Tx"
                subtitle="Avg entries per transaction"
                value={metrics.itemsPerTransaction.toFixed(1)}
                icon={Layers}
                delta={deltas.itemsPerTransaction}
              />
              <KpiCard
                title="Avg Item Value"
                subtitle="Mean item price"
                value={currencyFormatter.format(metrics.avgItemValue)}
                icon={ShoppingBag}
                delta={deltas.avgItemValue}
              />
              <KpiCard
                title="Total Items"
                subtitle="All line items"
                value={`${metrics.totalItems}`}
                icon={Layers}
                delta={deltas.totalItems}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
