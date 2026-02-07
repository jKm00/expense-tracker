"use client";

import { BottomNav } from "@/components/bottom-nav";
import { TransactionForm } from "@/components/transaction-form";
import { useCategories } from "@/hooks/use-data";

export default function Home() {
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      {/* Spacer to push form to bottom */}
      <div className="flex-1" />

      {/* Form at bottom for easy thumb reach */}
      <main className="mx-auto w-full max-w-lg px-4 pb-28">
        <TransactionForm categories={categories || []} />
      </main>

      <BottomNav />
    </div>
  );
}
