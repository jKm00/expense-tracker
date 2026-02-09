"use client";

import { formatCurrency } from "@/lib/utils";

interface BalanceOverviewProps {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  isLoading: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function BalanceOverview({
  balance,
  totalIncome,
  totalExpenses,
  isLoading,
}: BalanceOverviewProps) {
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });
  const greeting = getGreeting();

  if (isLoading) {
    return (
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-[#1e1e2e]" />
          <div className="h-14 w-56 animate-pulse rounded-lg bg-[#1e1e2e]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-[#1e1e2e]" />
          <div className="h-20 animate-pulse rounded-2xl bg-[#1e1e2e]" />
        </div>
      </div>
    );
  }

  const isPositive = balance >= 0;

  return (
    <div className="w-full">
      {/* Greeting */}
      <p className="text-slate-500">{greeting}</p>
      
      {/* Balance */}
      <div className="mt-1 mb-8">
        <h1
          className={`text-6xl font-bold tracking-tight ${
            isPositive ? "text-white" : "text-red-400"
          }`}
        >
          {formatCurrency(balance)}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{currentMonth} balance</p>
      </div>

      {/* Income & Expenses Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4">
          <p className="text-xs text-slate-500 mb-1">Income</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
        </div>
        
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-4">
          <p className="text-xs text-slate-500 mb-1">Expenses</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>
    </div>
  );
}
