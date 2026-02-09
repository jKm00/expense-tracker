"use client";

import { BottomNav } from "@/components/bottom-nav";
import { FixedTransactionForm } from "@/components/fixed-transaction-form";
import { FixedTransactionList } from "@/components/fixed-transaction-list";
import { TransactionListSkeleton } from "@/components/ui/skeleton";
import { useCategories, useFixedExpenses, useFixedIncome, useTotalFixedExpenses, useTotalFixedIncome } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";

export default function FixedTransactionsPage() {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: fixedExpenses, isLoading: expensesLoading } = useFixedExpenses();
  const { data: fixedIncome, isLoading: incomeLoading } = useFixedIncome();
  const { data: totalExpenses } = useTotalFixedExpenses();
  const { data: totalIncome } = useTotalFixedIncome();

  const isListLoading = expensesLoading || incomeLoading;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      <main className="mx-auto max-w-lg px-4 pt-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Monthly Fixed</h1>
          <p className="mt-1 text-sm text-slate-500">Recurring income and expenses</p>
        </div>

        {/* Summary */}
        <div className="mb-8 flex gap-4">
          <div className="flex-1 rounded-xl bg-emerald-500/10 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/70">Income</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              {formatCurrency(totalIncome || 0)}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-red-500/10 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-red-400/70">Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-400">
              {formatCurrency(totalExpenses || 0)}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="mb-8">
          {categoriesLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
              <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
              <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
                <div className="h-12 animate-pulse rounded-xl bg-[#1e1e2e]" />
              </div>
            </div>
          ) : (
            <FixedTransactionForm categories={categories || []} />
          )}
        </div>

        {/* List */}
        {isListLoading ? (
          <TransactionListSkeleton count={5} />
        ) : (
          <FixedTransactionList 
            expenses={fixedExpenses || []} 
            income={fixedIncome || []} 
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
