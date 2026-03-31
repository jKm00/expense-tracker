import { EmptyState } from "@/components/custom/empty-state";
import { TransactionListItem } from "./transaction-list-item";
import { ReceiptTextIcon } from "lucide-react";
import type { TransactionWithProduct } from "../transaction.models";
import { useMemo } from "react";

export function TransactionList({
  transactions,
}: {
  transactions: TransactionWithProduct[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, TransactionWithProduct[]>();

    for (const tx of transactions) {
      // ISO date string (YYYY-MM-DD) is a stable, locale-neutral key
      const key = tx.transaction.date.toISOString().slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(tx);
      map.set(key, bucket);
    }

    // Optional: sort the groups by date ascending
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, group]) => group);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        message="No transactions yet. Add your first transaction from the dashboard."
        icon={ReceiptTextIcon}
      />
    );
  }

  return (
    <div className="space-y-2">
      {grouped.map((group) => (
        <div key={group[0].transaction.date.toISOString()} className="mb-4">
          <h4 className="text-muted-foreground text-xs mb-1">
            {group[0].transaction.date.toLocaleString("en-UK", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </h4>
          <div className="space-y-2">
            {group.map((row) => (
              <TransactionListItem key={row.transaction.id} row={row} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
