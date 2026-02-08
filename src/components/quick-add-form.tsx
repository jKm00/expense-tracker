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
    <div className="bg-[#12121a]/95 backdrop-blur-xl rounded-2xl border border-[#1e1e2e] shadow-2xl shadow-black/50 overflow-hidden">
      {/* Amount Input - Large and prominent */}
      <div className="p-4 pb-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-500">
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
            className="h-16 w-full rounded-xl bg-[#0a0a0f] border-2 border-[#1e1e2e] pl-14 pr-4 text-3xl font-bold text-white transition-all placeholder:text-slate-700 focus:border-indigo-500/50 focus:outline-none focus:bg-[#0f0f15]"
          />
        </div>
      </div>

      {/* Category Select */}
      <div className="px-4 pb-3">
        <CategorySelect
          categories={categories}
          value={categoryName}
          onChange={handleCategoryChange}
          placeholder="Select category..."
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-0 border-t border-[#1e1e2e]">
        <button
          onClick={() => handleSubmit("expense")}
          disabled={isPending}
          className={cn(
            "h-14 flex items-center justify-center gap-2 font-semibold text-base transition-all",
            "bg-indigo-600/90 text-white hover:bg-indigo-600 active:bg-indigo-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "border-r border-[#1e1e2e]"
          )}
        >
          {isPending ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Expense
            </>
          )}
        </button>
        <button
          onClick={() => handleSubmit("income")}
          disabled={isPending}
          className={cn(
            "h-14 flex items-center justify-center gap-2 font-semibold text-base transition-all",
            "bg-emerald-600/90 text-white hover:bg-emerald-600 active:bg-emerald-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isPending ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Income
            </>
          )}
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={cn(
            "absolute -top-12 left-4 right-4 rounded-xl p-3 text-center text-sm font-medium animate-in slide-in-from-bottom-2 fade-in duration-200",
            message.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          )}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
