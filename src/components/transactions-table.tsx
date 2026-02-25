"use client";

import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { deleteTransaction, updateTransactionDate } from "@/actions/transactions";
import { invalidateTransactions } from "@/hooks/use-data";
import { useState, useTransition } from "react";

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

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string>("");

  const handleDelete = (id: string) => {
    if (confirm("Delete this transaction?")) {
      startTransition(async () => {
        await deleteTransaction(id);
        invalidateTransactions();
      });
    }
  };

  const handleRowClick = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditingDate(toDateInputValue(transaction.createdAt));
  };

  const handleDateSave = (id: string) => {
    if (!editingDate) return;
    const [year, month, day] = editingDate.split("-").map(Number);
    const newDate = new Date(year, month - 1, day);
    startTransition(async () => {
      await updateTransactionDate(id, newDate);
      invalidateTransactions();
      setEditingId(null);
    });
  };

  const handleDateCancel = () => {
    setEditingId(null);
  };

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No transactions this month
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1e1e2e]">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className={cn(
            "flex items-center justify-between py-3",
            isPending && "opacity-50"
          )}
        >
          <div
            className="flex flex-1 cursor-pointer items-center gap-3"
            onClick={() => editingId !== transaction.id && handleRowClick(transaction)}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm",
                transaction.type === "expense"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-emerald-500/10 text-emerald-400"
              )}
            >
              {transaction.type === "expense" ? "-" : "+"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">
                {transaction.categoryName}
              </p>
              {editingId === transaction.id ? (
                <div
                  className="mt-1 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="date"
                    value={editingDate}
                    onChange={(e) => setEditingDate(e.target.value)}
                    className="rounded border border-[#1e1e2e] bg-[#0a0a0f] px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleDateSave(transaction.id)}
                    disabled={isPending}
                    className="rounded px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleDateCancel}
                    className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-500/10"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {formatDate(transaction.createdAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "font-medium",
                transaction.type === "expense"
                  ? "text-red-400"
                  : "text-emerald-400"
              )}
            >
              {transaction.type === "expense" ? "-" : "+"}
              {formatCurrency(transaction.amount)}
            </span>
            <button
              onClick={() => handleDelete(transaction.id)}
              disabled={isPending}
              className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
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
