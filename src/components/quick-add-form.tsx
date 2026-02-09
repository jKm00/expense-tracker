"use client";

import { useState, useRef, useTransition } from "react";
import { CategorySelect } from "./category-select";
import { createTransaction } from "@/actions/transactions";
import { invalidateTransactions, invalidateCategories } from "@/hooks/use-data";
import type { Category } from "@/db/schema";
import { cn } from "@/lib/utils";

interface QuickAddFormProps {
  categories: Category[];
}

export function QuickAddForm({ categories }: QuickAddFormProps) {
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
    <div className="relative space-y-3">
      {message && (
        <div
          className={cn(
            "rounded-xl p-3 text-center text-sm font-medium",
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          )}
        >
          {message.text}
        </div>
      )}

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-slate-600">
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
          className="h-12 w-full rounded-xl border border-[#1e1e2e] bg-[#12121a] pl-11 pr-4 text-base font-semibold text-white placeholder:text-slate-700 focus:border-slate-700 focus:outline-none"
        />
      </div>

      <CategorySelect
        categories={categories}
        value={categoryName}
        onChange={handleCategoryChange}
        placeholder="Category"
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleSubmit("expense")}
          disabled={isPending}
          className={cn(
            "h-12 rounded-xl font-semibold transition-all active:scale-[0.98]",
            "bg-red-500/10 text-red-400 hover:bg-red-500/20",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isPending ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
          ) : (
            "Expense"
          )}
        </button>
        <button
          onClick={() => handleSubmit("income")}
          disabled={isPending}
          className={cn(
            "h-12 rounded-xl font-semibold transition-all active:scale-[0.98]",
            "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isPending ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
          ) : (
            "Income"
          )}
        </button>
      </div>
    </div>
  );
}
