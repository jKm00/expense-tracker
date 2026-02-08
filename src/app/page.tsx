"use client";

import { BottomNav } from "@/components/bottom-nav";
import { QuickAddForm } from "@/components/quick-add-form";
import { RecentTransactions } from "@/components/recent-transactions";
import { BalanceOverview } from "@/components/balance-overview";
import {
  useCategories,
  useRecentTransactions,
  useMonthlyStats,
  useTotalFixedExpenses,
  useTotalFixedIncome,
} from "@/hooks/use-data";

export default function Home() {
  const now = new Date();
  const { data: categories } = useCategories();
  const { data: recentTransactions, isLoading: transactionsLoading } = useRecentTransactions();
  const { data: stats, isLoading: statsLoading } = useMonthlyStats(
    now.getFullYear(),
    now.getMonth()
  );
  const { data: totalFixedExpenses } = useTotalFixedExpenses();
  const { data: totalFixedIncome } = useTotalFixedIncome();

  const variableIncome = stats?.totalIncome || 0;
  const variableExpenses = stats?.totalExpenses || 0;
  const fixedIncome = totalFixedIncome || 0;
  const fixedExpenses = totalFixedExpenses || 0;
  
  const totalIncome = variableIncome + fixedIncome;
  const totalExpenses = variableExpenses + fixedExpenses;
  const balance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-[320px]">
      {/* Background gradient that extends across the page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/15 via-indigo-900/5 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Hero Section with Balance */}
      <div className="relative">
        <div className="relative mx-auto max-w-lg px-4 pt-12 pb-8">
          {/* Greeting */}
          <p className="text-slate-500 text-sm font-medium mb-1">
            {getGreeting()}
          </p>
          
          {/* Balance Display */}
          <BalanceOverview
            balance={balance}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            isLoading={statsLoading}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative mx-auto max-w-lg px-4 pb-8">
        {/* Recent Transactions */}
        <RecentTransactions
          transactions={recentTransactions || []}
          isLoading={transactionsLoading}
        />
      </main>

      {/* Floating Quick Add Form */}
      <div
        className="fixed bottom-32 left-0 right-0 mx-auto z-50 px-4"
        style={{ width: "min(100%, 32rem)" }}
      >
        <QuickAddForm categories={categories || []} />
      </div>

      <BottomNav />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
