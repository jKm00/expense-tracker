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
      setMessage({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    if (!categoryName.trim()) {
      setMessage({ type: "error", text: "Please select or enter a category" });
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

        // Clear message after 2 seconds
        setTimeout(() => setMessage(null), 2000);
      } catch {
        setMessage({ type: "error", text: "Something went wrong" });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Amount Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-400">
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
            className="h-16 w-full rounded-xl border-2 border-gray-200 bg-white pl-12 pr-4 text-2xl font-medium transition-colors placeholder:text-gray-300 focus:border-gray-900 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Category Select */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          Category
        </label>
        <CategorySelect
          categories={categories}
          value={categoryName}
          onChange={handleCategoryChange}
          placeholder="Search or create category..."
        />
        {isNewCategory && categoryName && (
          <p className="mt-1 text-sm text-emerald-600">
            New category will be created
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          variant="expense"
          size="lg"
          onClick={() => handleSubmit("expense")}
          disabled={isPending}
          className="text-lg font-semibold"
        >
          {isPending ? "..." : "Expense"}
        </Button>
        <Button
          variant="income"
          size="lg"
          onClick={() => handleSubmit("income")}
          disabled={isPending}
          className="text-lg font-semibold"
        >
          {isPending ? "..." : "Income"}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-3 text-center text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
