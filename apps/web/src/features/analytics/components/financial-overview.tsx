import { FullTransaction } from "@/features/transactions/transactions.models";
import { calculateAnalyticsMetrics } from "@/features/analytics/analytics.calculations";
import { formatAmountNoDecimals } from "@/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type FinancialOverviewProps = {
  transactions: FullTransaction[];
};

export function FinancialOverview({ transactions }: FinancialOverviewProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions),
    [transactions],
  );

  return (
    <Card size="sm">
      <CardContent className="grid grid-cols-3 gap-3 py-1">
        <OverviewStat
          label="Balance"
          value={formatAmountNoDecimals(metrics.netBalance, { sign: true })}
          className={metrics.netBalance < 0 ? "text-expense" : "text-income"}
        />
        <OverviewStat
          label="Income"
          value={formatAmountNoDecimals(metrics.totalIncome)}
        />
        <OverviewStat
          label="Expenses"
          value={formatAmountNoDecimals(metrics.totalExpenses)}
        />
      </CardContent>
    </Card>
  );
}

export function FinancialOverviewSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="grid grid-cols-3 gap-3 py-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OverviewStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-base leading-tight font-semibold tracking-tight",
          className,
        )}
      >
        {value}
      </p>
    </div>
  );
}
