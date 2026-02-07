"use client";

import useSWR, { mutate } from "swr";
import {
  getRecentTransactions,
  getTransactionsByMonth,
  getMonthlyStats,
} from "@/actions/transactions";
import { getCategories } from "@/actions/categories";
import {
  getFixedExpenses,
  getFixedExpensesByCategory,
  getTotalFixedExpenses,
} from "@/actions/fixed-expenses";

// Cache keys
export const CACHE_KEYS = {
  categories: "categories",
  recentTransactions: "recent-transactions",
  monthlyTransactions: (year: number, month: number) =>
    `transactions-${year}-${month}`,
  monthlyStats: (year: number, month: number) => `stats-${year}-${month}`,
  fixedExpenses: "fixed-expenses",
  fixedExpensesByCategory: "fixed-expenses-by-category",
  totalFixedExpenses: "total-fixed-expenses",
};

// Hooks
export function useCategories() {
  return useSWR(CACHE_KEYS.categories, getCategories);
}

export function useRecentTransactions() {
  return useSWR(CACHE_KEYS.recentTransactions, () => getRecentTransactions(5));
}

export function useMonthlyTransactions(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyTransactions(year, month), () =>
    getTransactionsByMonth(year, month)
  );
}

export function useMonthlyStats(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyStats(year, month), () =>
    getMonthlyStats(year, month)
  );
}

export function useFixedExpenses() {
  return useSWR(CACHE_KEYS.fixedExpenses, getFixedExpenses);
}

export function useFixedExpensesByCategory() {
  return useSWR(CACHE_KEYS.fixedExpensesByCategory, getFixedExpensesByCategory);
}

export function useTotalFixedExpenses() {
  return useSWR(CACHE_KEYS.totalFixedExpenses, getTotalFixedExpenses);
}

// Invalidation helpers
export function invalidateAll() {
  mutate(() => true, undefined, { revalidate: true });
}

export function invalidateTransactions() {
  mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith("transactions-") ||
        key.startsWith("stats-") ||
        key === CACHE_KEYS.recentTransactions),
    undefined,
    { revalidate: true }
  );
}

export function invalidateCategories() {
  mutate(CACHE_KEYS.categories, undefined, { revalidate: true });
}

export function invalidateFixedExpenses() {
  mutate(
    (key) =>
      typeof key === "string" &&
      (key === CACHE_KEYS.fixedExpenses ||
        key === CACHE_KEYS.fixedExpensesByCategory ||
        key === CACHE_KEYS.totalFixedExpenses),
    undefined,
    { revalidate: true }
  );
}
