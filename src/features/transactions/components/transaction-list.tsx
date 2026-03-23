import { EmptyState } from "@/components/custom/empty-state";
import { TransactionListItem } from "./transaction-list-item";
import { ReceiptTextIcon } from "lucide-react";
import type { TransactionWithProduct } from "../transaction.models";

export function TransactionList({
  transactions,
}: {
  transactions: TransactionWithProduct[];
}) {
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
      {transactions.map((row) => (
        <TransactionListItem key={row.transaction.id} row={row} />
      ))}
    </div>
  );
}
