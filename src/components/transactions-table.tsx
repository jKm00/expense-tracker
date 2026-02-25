"use client";

import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { deleteTransaction, updateTransactionDate } from "@/actions/transactions";
import { invalidateTransactions } from "@/hooks/use-data";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

interface EditDateDialogProps {
  transaction: Transaction;
  onSave: (id: string, date: string) => void;
  onClose: () => void;
  isPending: boolean;
}

function EditDateDialog({ transaction, onSave, onClose, isPending }: EditDateDialogProps) {
  const [date, setDate] = useState(toDateInputValue(transaction.createdAt));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold text-slate-100">Update Date</h2>
        <p className="mb-4 text-sm text-slate-500">{transaction.categoryName}</p>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex gap-3">
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onSave(transaction.id, date)}
            disabled={isPending || !date}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this transaction?")) {
      startTransition(async () => {
        await deleteTransaction(id);
        invalidateTransactions();
      });
    }
  };

  const handleDateSave = (id: string, dateStr: string) => {
    if (!dateStr) return;
    const [year, month, day] = dateStr.split("-").map(Number);
    const newDate = new Date(year, month - 1, day);
    startTransition(async () => {
      await updateTransactionDate(id, newDate);
      invalidateTransactions();
      setEditingTransaction(null);
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No transactions this month
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#1e1e2e]">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className={cn(
              "flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-white/[0.02] rounded-lg px-1 -mx-1",
              isPending && "opacity-50"
            )}
            onClick={() => setEditingTransaction(transaction)}
          >
            <div className="flex items-center gap-3">
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
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {transaction.categoryName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(transaction.createdAt)}
                </p>
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
                onClick={(e) => handleDelete(e, transaction.id)}
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

      {editingTransaction && (
        <EditDateDialog
          transaction={editingTransaction}
          onSave={handleDateSave}
          onClose={() => setEditingTransaction(null)}
          isPending={isPending}
        />
      )}
    </>
  );
}
