"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { CategorySelect } from "./category-select";
import { createFixedExpense } from "@/actions/fixed-expenses";
import { invalidateFixedExpenses, invalidateCategories } from "@/hooks/use-data";
import type { Category } from "@/db/schema";

interface FixedExpenseFormProps {
  categories: Category[];
}

export function FixedExpenseForm({ categories }: FixedExpenseFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleCategoryChange = (value: string, isNew: boolean) => {
    setCategoryName(value);
    setIsNewCategory(isNew);
  };

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);

    if (!name.trim()) {
      setMessage({ type: "error", text: "Please enter a name" });
      return;
    }

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
        await createFixedExpense(name.trim(), amountNum, categoryName.trim());

        // Invalidate caches
        invalidateFixedExpenses();
        if (isNewCategory) {
          invalidateCategories();
        }

        setName("");
        setAmount("");
        setCategoryName("");
        setIsNewCategory(false);
        setMessage({ type: "success", text: "Fixed expense added!" });

        setTimeout(() => setMessage(null), 2000);
      } catch {
        setMessage({ type: "error", text: "Something went wrong" });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Name Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Netflix, Rent, Phone"
          className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-base transition-colors placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
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

      {/* Amount Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-600">
          Monthly Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-400">
            kr
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="h-12 w-full rounded-xl border-2 border-gray-200 bg-white pl-12 pr-4 text-base font-medium transition-colors placeholder:text-gray-300 focus:border-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? "Adding..." : "Add Fixed Expense"}
      </Button>

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
