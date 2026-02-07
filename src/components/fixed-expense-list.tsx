"use client";

import { useTransition } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { deleteFixedExpense } from "@/actions/fixed-expenses";
import { invalidateFixedExpenses } from "@/hooks/use-data";

interface FixedExpenseItem {
  id: string;
  name: string;
  amount: string;
  categoryName: string;
}

interface FixedExpenseListProps {
  expenses: FixedExpenseItem[];
}

export function FixedExpenseList({ expenses }: FixedExpenseListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      startTransition(async () => {
        await deleteFixedExpense(id);
        invalidateFixedExpenses();
      });
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No fixed expenses yet. Add your recurring costs above.
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div>
      {/* Total */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-[#1e1e2e] p-3">
        <span className="text-sm font-medium text-slate-400">Monthly Total</span>
        <span className="text-lg font-bold text-slate-100">
          {formatCurrency(total)}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#1e1e2e]">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className={cn(
              "flex items-center justify-between py-3",
              isPending && "opacity-50"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 truncate">
                {expense.name}
              </p>
              <p className="text-sm text-slate-500">{expense.categoryName}</p>
            </div>

            <div className="flex items-center gap-3 ml-3">
              <span className="font-semibold text-slate-200 whitespace-nowrap">
                {formatCurrency(expense.amount)}
              </span>
              <button
                onClick={() => handleDelete(expense.id, expense.name)}
                disabled={isPending}
                className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
    </div>
  );
}
