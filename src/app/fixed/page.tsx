"use client";

import { BottomNav } from "@/components/bottom-nav";
import { FixedExpenseForm } from "@/components/fixed-expense-form";
import { FixedExpenseList } from "@/components/fixed-expense-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TransactionListSkeleton } from "@/components/ui/skeleton";
import { useCategories, useFixedExpenses } from "@/hooks/use-data";

export default function FixedExpensesPage() {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: fixedExpenses, isLoading: expensesLoading } = useFixedExpenses();

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24">
      <header className="sticky top-0 z-40 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-semibold text-slate-100">Fixed Expenses</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Add Form */}
        <Card className="mb-6 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">Add Fixed Expense</CardTitle>
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
              <FixedExpenseForm categories={categories || []} />
            )}
          </CardContent>
        </Card>

        {/* Fixed Expenses List */}
        <Card className="border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">Your Fixed Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <TransactionListSkeleton count={3} />
            ) : (
              <FixedExpenseList expenses={fixedExpenses || []} />
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
