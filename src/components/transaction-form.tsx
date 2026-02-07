"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "./ui/button";
import { CategorySelect } from "./category-select";
import { createTransaction } from "@/actions/transactions";
import { invalidateTransactions, invalidateCategories } from "@/hooks/use-data";
import type { Category } from "@/db/schema";

interface TransactionFormProps {
  categories: Category[];
}

export function TransactionForm({ categories }: TransactionFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const handleCategoryChange = (value: string, isNew: boolean) => {
    setCategoryName(value);
    setIsNewCategory(isNew);
  };

  const handleSubmit = (type: "expense" | "income") => {
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum <= 0) {
      setMessage({ type: "error", text: "Enter an amount" });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (!categoryName.trim()) {
      setMessage({ type: "error", text: "Select a category" });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    startTransition(async () => {
      try {
        await createTransaction(amountNum, type, categoryName.trim());

        // Invalidate caches
        invalidateTransactions();
        if (isNewCategory) {
          invalidateCategories();
        }

        setAmount("");
        setCategoryName("");
        setIsNewCategory(false);
        setMessage({
          type: "success",
          text: `${type === "expense" ? "Expense" : "Income"} added!`,
        });
        amountRef.current?.focus();

        setTimeout(() => setMessage(null), 2000);
      } catch {
        setMessage({ type: "error", text: "Something went wrong" });
        setTimeout(() => setMessage(null), 2000);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Amount Input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-500">
          kr
        </span>
        <input
          ref={amountRef}
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="h-14 w-full rounded-xl border-2 border-[#1e1e2e] bg-[#12121a] pl-12 pr-4 text-2xl font-semibold text-slate-100 transition-colors placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category Select */}
      <CategorySelect
        categories={categories}
        value={categoryName}
        onChange={handleCategoryChange}
        placeholder="Category..."
      />

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="expense"
          size="lg"
          onClick={() => handleSubmit("expense")}
          disabled={isPending}
          className="text-base font-semibold"
        >
          {isPending ? "..." : "Expense"}
        </Button>
        <Button
          variant="income"
          size="lg"
          onClick={() => handleSubmit("income")}
          disabled={isPending}
          className="text-base font-semibold"
        >
          {isPending ? "..." : "Income"}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-3 text-center text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
