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
  getFixedExpensesByCategoryDetailed,
  getTotalFixedExpenses,
} from "@/actions/fixed-expenses";
import {
  getFixedIncome,
  getFixedIncomeByCategory,
  getFixedIncomeByCategoryDetailed,
  getTotalFixedIncome,
} from "@/actions/fixed-income";

// Cache keys
export const CACHE_KEYS = {
  categories: "categories",
  recentTransactions: "recent-transactions",
  monthlyTransactions: (year: number, month: number) =>
    `transactions-${year}-${month}`,
  monthlyStats: (year: number, month: number) => `stats-${year}-${month}`,
  fixedExpenses: "fixed-expenses",
  fixedExpensesByCategory: "fixed-expenses-by-category",
  fixedExpensesByCategoryDetailed: "fixed-expenses-by-category-detailed",
  totalFixedExpenses: "total-fixed-expenses",
  fixedIncome: "fixed-income",
  fixedIncomeByCategory: "fixed-income-by-category",
  fixedIncomeByCategoryDetailed: "fixed-income-by-category-detailed",
  totalFixedIncome: "total-fixed-income",
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

export function useFixedExpensesByCategoryDetailed() {
  return useSWR(CACHE_KEYS.fixedExpensesByCategoryDetailed, getFixedExpensesByCategoryDetailed);
}

export function useTotalFixedExpenses() {
  return useSWR(CACHE_KEYS.totalFixedExpenses, getTotalFixedExpenses);
}

export function useFixedIncome() {
  return useSWR(CACHE_KEYS.fixedIncome, getFixedIncome);
}

export function useFixedIncomeByCategory() {
  return useSWR(CACHE_KEYS.fixedIncomeByCategory, getFixedIncomeByCategory);
}

export function useFixedIncomeByCategoryDetailed() {
  return useSWR(CACHE_KEYS.fixedIncomeByCategoryDetailed, getFixedIncomeByCategoryDetailed);
}

export function useTotalFixedIncome() {
  return useSWR(CACHE_KEYS.totalFixedIncome, getTotalFixedIncome);
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
        key === CACHE_KEYS.fixedExpensesByCategoryDetailed ||
        key === CACHE_KEYS.totalFixedExpenses),
    undefined,
    { revalidate: true }
  );
}

export function invalidateFixedIncome() {
  mutate(
    (key) =>
      typeof key === "string" &&
      (key === CACHE_KEYS.fixedIncome ||
        key === CACHE_KEYS.fixedIncomeByCategory ||
        key === CACHE_KEYS.fixedIncomeByCategoryDetailed ||
        key === CACHE_KEYS.totalFixedIncome),
    undefined,
    { revalidate: true }
  );
}
