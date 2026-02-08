"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { FixedTransactionForm } from "@/components/fixed-transaction-form";
import { FixedExpenseList } from "@/components/fixed-expense-list";
import { FixedIncomeList } from "@/components/fixed-income-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TransactionListSkeleton } from "@/components/ui/skeleton";
import { useCategories, useFixedExpenses, useFixedIncome } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

type TabType = "expenses" | "income";

export default function FixedTransactionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("expenses");
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: fixedExpenses, isLoading: expensesLoading } = useFixedExpenses();
  const { data: fixedIncome, isLoading: incomeLoading } = useFixedIncome();

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24">
      <header className="sticky top-0 z-40 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-semibold text-slate-100">Fixed Transactions</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Add Form */}
        <Card className="mb-6 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">Add Fixed Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="space-y-4">
                <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
                <div className="h-11 animate-pulse rounded-xl bg-[#1e1e2e]" />
              </div>
            ) : (
              <FixedTransactionForm categories={categories || []} />
            )}
          </CardContent>
        </Card>

        {/* Fixed Transactions List with Tabs */}
        <Card className="border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">Your Fixed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="mb-4 flex rounded-xl bg-[#1e1e2e] p-1">
              <button
                onClick={() => setActiveTab("expenses")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                  activeTab === "expenses"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Expenses
                {!expensesLoading && fixedExpenses && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({fixedExpenses.length})
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("income")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                  activeTab === "income"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Income
                {!incomeLoading && fixedIncome && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({fixedIncome.length})
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "expenses" ? (
              expensesLoading ? (
                <TransactionListSkeleton count={3} />
              ) : (
                <FixedExpenseList expenses={fixedExpenses || []} />
              )
            ) : (
              incomeLoading ? (
                <TransactionListSkeleton count={3} />
              ) : (
                <FixedIncomeList income={fixedIncome || []} />
              )
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
