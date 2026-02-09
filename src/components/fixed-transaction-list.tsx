"use client";

import { useTransition } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { deleteFixedExpense } from "@/actions/fixed-expenses";
import { deleteFixedIncome } from "@/actions/fixed-income";
import { invalidateFixedExpenses, invalidateFixedIncome } from "@/hooks/use-data";

interface FixedItem {
  id: string;
  name: string;
  amount: string;
  categoryName: string;
}

interface FixedTransactionListProps {
  expenses: FixedItem[];
  income: FixedItem[];
}

export function FixedTransactionList({ expenses, income }: FixedTransactionListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDeleteExpense = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      startTransition(async () => {
        await deleteFixedExpense(id);
        invalidateFixedExpenses();
      });
    }
  };

  const handleDeleteIncome = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      startTransition(async () => {
        await deleteFixedIncome(id);
        invalidateFixedIncome();
      });
    }
  };

  const allItems = [
    ...income.map(item => ({ ...item, type: "income" as const })),
    ...expenses.map(item => ({ ...item, type: "expense" as const })),
  ].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

  if (allItems.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No fixed transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allItems.map((item) => {
        const isIncome = item.type === "income";
        
        return (
          <div
            key={`${item.type}-${item.id}`}
            className={cn(
              "group flex items-center justify-between rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4 transition-colors",
              isPending && "opacity-50"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                  isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
                )}
              >
                {isIncome ? (
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-200 truncate">{item.name}</p>
                <p className="text-sm text-slate-500">{item.categoryName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3">
              <span className={cn(
                "font-semibold whitespace-nowrap",
                isIncome ? "text-emerald-400" : "text-red-400"
              )}>
                {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
              </span>
              <button
                onClick={() => isIncome 
                  ? handleDeleteIncome(item.id, item.name)
                  : handleDeleteExpense(item.id, item.name)
                }
                disabled={isPending}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
