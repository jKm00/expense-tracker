"use client";

import { formatCurrency } from "@/lib/utils";

interface BalanceOverviewProps {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  isLoading: boolean;
}

export function BalanceOverview({
  balance,
  totalIncome,
  totalExpenses,
  isLoading,
}: BalanceOverviewProps) {
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="h-16 w-48 animate-pulse rounded-lg bg-[#1e1e2e]" />
        <div className="flex gap-8">
          <div className="h-12 w-24 animate-pulse rounded-lg bg-[#1e1e2e]" />
          <div className="h-12 w-24 animate-pulse rounded-lg bg-[#1e1e2e]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-2 text-sm font-medium text-slate-500">{currentMonth}</p>
      
      <h1
        className={`text-5xl font-bold tracking-tight ${
          balance >= 0 ? "text-white" : "text-red-400"
        }`}
      >
        {formatCurrency(balance)}
      </h1>

      <div className="mt-8 flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold text-emerald-400">
            {formatCurrency(totalIncome)}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Income
          </span>
        </div>
        <div className="h-12 w-px bg-[#1e1e2e]" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold text-red-400">
            {formatCurrency(totalExpenses)}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            Expenses
          </span>
        </div>
      </div>
    </div>
  );
}
