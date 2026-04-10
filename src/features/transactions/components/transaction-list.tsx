import { Link } from "@tanstack/react-router";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { ChevronRight, Package, Receipt } from "lucide-react";
import { FullTransaction } from "../transactions.models";
import { useMemo } from "react";
import { transactionUtils } from "../transactions.utils";

export function TransactionList({
  transactions,
}: {
  transactions: FullTransaction[];
}) {
  const hasProducts = transactions.length > 0;

  const grouped = useMemo(
    () => transactionUtils.group(transactions),
    [transactions],
  );

  return (
    <div>
      {hasProducts ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group[0].createdAt.toISOString()}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group[0].createdAt.toLocaleString("en-UK", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                {group.map((transaction, idx) => (
                  <Link
                    key={transaction.id}
                    to="/dashboard/transactions/$id"
                    params={{ id: transaction.id }}
                  >
                    <div
                      className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== group.length - 1 ? "border-b border-border/40" : ""}`}
                    >
                      <Receipt className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {transaction.store || "Transaction"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.entries.length} item
                          {transaction.entries.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${Number(transaction.totalPrice) < 0 ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {Number(transaction.totalPrice) > 0 ? "+" : ""}
                        {transaction.totalPrice}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Package}>
          <EmptyStateMessage>No transactions available</EmptyStateMessage>
        </EmptyState>
      )}
    </div>
  );
}
