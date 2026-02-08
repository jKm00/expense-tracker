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
      <div className="space-y-4">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-[#1e1e2e]" />
        <div className="flex gap-6">
          <div className="h-6 w-24 animate-pulse rounded bg-[#1e1e2e]" />
          <div className="h-6 w-24 animate-pulse rounded bg-[#1e1e2e]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main Balance */}
      <div className="mb-4">
        <h1
          className={`text-4xl font-bold tracking-tight ${
            balance >= 0 ? "text-white" : "text-red-400"
          }`}
        >
          {formatCurrency(balance)}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {currentMonth} balance
        </p>
      </div>

      {/* Income / Expenses Pills */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-sm font-medium text-red-400">
            {formatCurrency(totalExpenses)}
          </span>
        </div>
      </div>
    </div>
  );
}
