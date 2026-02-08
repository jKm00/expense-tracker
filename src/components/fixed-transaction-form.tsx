"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { CategorySelect } from "./category-select";
import { createFixedExpense } from "@/actions/fixed-expenses";
import { createFixedIncome } from "@/actions/fixed-income";
import { invalidateFixedExpenses, invalidateFixedIncome, invalidateCategories } from "@/hooks/use-data";
import type { Category } from "@/db/schema";

interface FixedTransactionFormProps {
  categories: Category[];
}

export function FixedTransactionForm({ categories }: FixedTransactionFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingType, setPendingType] = useState<"expense" | "income" | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleCategoryChange = (value: string, isNew: boolean) => {
    setCategoryName(value);
    setIsNewCategory(isNew);
  };

  const handleSubmit = (type: "expense" | "income") => {
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

    setPendingType(type);
    startTransition(async () => {
      try {
        if (type === "expense") {
          await createFixedExpense(name.trim(), amountNum, categoryName.trim());
          invalidateFixedExpenses();
        } else {
          await createFixedIncome(name.trim(), amountNum, categoryName.trim());
          invalidateFixedIncome();
        }

        if (isNewCategory) {
          invalidateCategories();
        }

        setName("");
        setAmount("");
        setCategoryName("");
        setIsNewCategory(false);
        setMessage({ 
          type: "success", 
          text: type === "expense" ? "Fixed expense added!" : "Fixed income added!" 
        });

        setTimeout(() => setMessage(null), 2000);
      } catch {
        setMessage({ type: "error", text: "Something went wrong" });
      } finally {
        setPendingType(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Name Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-400">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Netflix, Rent, Salary"
          className="flex h-12 w-full rounded-xl border-2 border-[#1e1e2e] bg-[#0a0a0f] px-4 text-base text-slate-100 transition-colors placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category Select */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-400">
          Category
        </label>
        <CategorySelect
          categories={categories}
          value={categoryName}
          onChange={handleCategoryChange}
          placeholder="Search or create category..."
        />
        {isNewCategory && categoryName && (
          <p className="mt-1 text-sm text-emerald-400">
            New category will be created
          </p>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-400">
          Monthly Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-500">
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
            className="h-12 w-full rounded-xl border-2 border-[#1e1e2e] bg-[#0a0a0f] pl-12 pr-4 text-base font-medium text-slate-100 transition-colors placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleSubmit("expense")}
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="lg"
        >
          {pendingType === "expense" ? "Adding..." : "Add Expense"}
        </Button>
        <Button
          onClick={() => handleSubmit("income")}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          {pendingType === "income" ? "Adding..." : "Add Income"}
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
