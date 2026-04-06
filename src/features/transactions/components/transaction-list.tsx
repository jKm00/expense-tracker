import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { ChevronRight, Package } from "lucide-react";
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
    <div className="grid gap-2">
      {hasProducts ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div>
              <h3 className="text-muted-foreground text-xs">
                {group[0].createdAt.toLocaleString("en-UK", {
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="grid gap-2">
                {group.map((transaction) => (
                  <Link
                    key={transaction.id}
                    to="/dashboard/transactions/$id"
                    params={{ id: transaction.id }}
                  >
                    <Card>
                      <CardContent className="flex justify-between items-center gap-4">
                        <div>
                          <h3
                            className={`font-semibold ${Number(transaction.totalPrice) < 0 ? "text-red-400" : "text-green-400"}`}
                          >
                            {transaction.totalPrice}
                          </h3>
                          <p className="text-muted-foreground text-xs">
                            {transaction.entries.length} items
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-5" />
                      </CardContent>
                    </Card>
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
