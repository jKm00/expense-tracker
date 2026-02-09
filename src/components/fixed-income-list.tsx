"use client";

import { useTransition } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { deleteFixedIncome } from "@/actions/fixed-income";
import { invalidateFixedIncome } from "@/hooks/use-data";

interface FixedIncomeItem {
  id: string;
  name: string;
  amount: string;
  categoryName: string;
}

interface FixedIncomeListProps {
  income: FixedIncomeItem[];
}

export function FixedIncomeList({ income }: FixedIncomeListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      startTransition(async () => {
        await deleteFixedIncome(id);
        invalidateFixedIncome();
      });
    }
  };

  if (income.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        No fixed income yet
      </div>
    );
  }

  const total = income.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <div className="space-y-3">
      {/* Total */}
      <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/70">
          Monthly Total
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-400">
          {formatCurrency(total)}
        </p>
      </div>

      {/* List */}
      <div className="space-y-2">
        {income.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4",
              isPending && "opacity-50"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 truncate">
                {item.name}
              </p>
              <p className="text-sm text-slate-500">{item.categoryName}</p>
            </div>

            <div className="flex items-center gap-3 ml-3">
              <span className="font-semibold text-emerald-400 whitespace-nowrap">
                {formatCurrency(item.amount)}
              </span>
              <button
                onClick={() => handleDelete(item.id, item.name)}
                disabled={isPending}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
