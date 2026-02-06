"use client";

import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { deleteTransaction } from "@/actions/transactions";
import { invalidateTransactions } from "@/hooks/use-data";
import { useTransition } from "react";

interface Transaction {
  id: string;
  amount: string;
  type: "expense" | "income";
  createdAt: Date;
  categoryName: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (confirm("Delete this transaction?")) {
      startTransition(async () => {
        await deleteTransaction(id);
        invalidateTransactions();
      });
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No transactions this month
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className={cn(
            "flex items-center justify-between py-3",
            isPending && "opacity-50"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm",
                transaction.type === "expense"
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
              )}
            >
              {transaction.type === "expense" ? "-" : "+"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {transaction.categoryName}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium",
                transaction.type === "expense"
                  ? "text-red-600"
                  : "text-emerald-600"
              )}
            >
              {transaction.type === "expense" ? "-" : "+"}
              {formatCurrency(transaction.amount)}
            </span>
            <button
              onClick={() => handleDelete(transaction.id)}
              disabled={isPending}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
