"use client";

import { BottomNav } from "@/components/bottom-nav";
import { QuickAddForm } from "@/components/quick-add-form";
import { BalanceOverview } from "@/components/balance-overview";
import {
  useCategories,
  useMonthlyStats,
  useTotalFixedExpenses,
  useTotalFixedIncome,
} from "@/hooks/use-data";

export default function Home() {
  const now = new Date();
  const { data: categories } = useCategories();
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
    <div className="flex min-h-screen flex-col bg-[#0a0a0f]">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4">
        <div className="flex flex-1 items-center">
          <BalanceOverview
            balance={balance}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            isLoading={statsLoading}
          />
        </div>

        <div className="pb-32">
          <QuickAddForm categories={categories || []} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
