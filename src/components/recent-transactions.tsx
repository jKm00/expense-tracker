import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: string;
  type: "expense" | "income";
  createdAt: Date;
  categoryName: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No transactions yet. Add your first one above!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between py-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-lg",
                transaction.type === "expense"
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
              )}
            >
              {transaction.type === "expense" ? "−" : "+"}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {transaction.categoryName}
              </p>
              <p className="text-sm text-gray-400">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "font-semibold",
              transaction.type === "expense"
                ? "text-red-600"
                : "text-emerald-600"
            )}
          >
            {transaction.type === "expense" ? "−" : "+"}
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
