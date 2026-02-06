"use client";

import { BottomNav } from "@/components/bottom-nav";
import { TransactionForm } from "@/components/transaction-form";
import { RecentTransactions } from "@/components/recent-transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TransactionListSkeleton } from "@/components/ui/skeleton";
import { useCategories, useRecentTransactions } from "@/hooks/use-data";

export default function Home() {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: recentTransactions, isLoading: transactionsLoading } =
    useRecentTransactions();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-semibold">Expense Tracker</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Transaction Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="space-y-4">
                <div className="h-16 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
                  <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
                </div>
              </div>
            ) : (
              <TransactionForm categories={categories || []} />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <TransactionListSkeleton count={5} />
            ) : (
              <RecentTransactions transactions={recentTransactions || []} />
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
