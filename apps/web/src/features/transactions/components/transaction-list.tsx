import { Link } from "@tanstack/react-router";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Plus,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { FullTransaction } from "../transactions.models";
import { useMemo } from "react";
import { transactionUtils } from "../transactions.utils";
import { formatAmount } from "@/utils";

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
          {grouped.map((group) => {
            const balance = group.reduce(
              (sum, transaction) => sum + Number(transaction.totalPrice),
              0,
            );
            const BalanceIcon = balance < 0 ? ArrowDown : ArrowUp;

            return (
              <div key={group[0].date.toISOString()}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group[0].date.toLocaleString("en-UK", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    {balance !== 0 ? <BalanceIcon className="size-3" /> : null}
                    {formatAmount(Math.abs(balance))} NOK
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {group.map((transaction, idx) => (
                    <Link
                      key={transaction.id}
                      to="/dashboard/transactions/$id"
                      params={{ id: transaction.id }}
                    >
                      <div
                        className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== group.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                          <Receipt className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {transaction.store || "Transaction"}
                            </p>
                            {transaction.needsReview ? (
                              <Badge variant="outline">Needs review</Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {transaction.entries.length} item
                            {transaction.entries.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold tabular-nums ${Number(transaction.totalPrice) < 0 ? "text-expense" : "text-income"}`}
                        >
                          {formatAmount(transaction.totalPrice, { sign: true })} NOK
                        </span>
                        <ChevronRight className="size-3.5 text-muted-foreground/40" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={ShoppingBag}>
          <EmptyStateMessage>
            You do not have any transactions for this period yet.
          </EmptyStateMessage>
          <EmptyStateAction>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/transactions/new">
                <Plus className="size-4" />
                Create transaction
              </Link>
            </Button>
          </EmptyStateAction>
        </EmptyState>
      )}
    </div>
  );
}
