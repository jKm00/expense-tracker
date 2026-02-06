"use client";

import { BottomNav } from "@/components/bottom-nav";
import { TransactionForm } from "@/components/transaction-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCategories } from "@/hooks/use-data";

export default function Home() {
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <main className="grow flex flex-col justify-center mx-auto max-w-lg px-4 py-6">
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
      </main>

      <BottomNav />
    </div>
  );
}
