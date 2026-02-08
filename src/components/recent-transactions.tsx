"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: string;
  type: "expense" | "income";
  createdAt: Date;
  categoryName: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 animate-pulse rounded bg-[#1e1e2e]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[#1e1e2e]" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-[#1e1e2e]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-400 mb-4">
          Recent Activity
        </h2>
        <div className="rounded-2xl border border-dashed border-[#2a2a3a] bg-[#12121a]/50 p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#1e1e2e] flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No transactions yet</p>
          <p className="text-slate-600 text-xs mt-1">
            Add your first one below
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400">Recent Activity</h2>
        <Link
          href="/analytics"
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          See all
        </Link>
      </div>

      <div className="space-y-2">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isExpense = transaction.type === "expense";
  const formattedDate = formatRelativeDate(transaction.createdAt);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] hover:border-[#2a2a3a] transition-colors">
      {/* Category Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isExpense ? "bg-red-500/10" : "bg-emerald-500/10"
        }`}
      >
        <span
          className={`text-lg ${isExpense ? "text-red-400" : "text-emerald-400"}`}
        >
          {isExpense ? "−" : "+"}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">
          {transaction.categoryName}
        </p>
        <p className="text-xs text-slate-500">{formattedDate}</p>
      </div>

      {/* Amount */}
      <p
        className={`text-sm font-semibold ${
          isExpense ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {isExpense ? "−" : "+"}
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
