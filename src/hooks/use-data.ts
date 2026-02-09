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
import {
  getTotalFixedExpensesForMonth,
  getTotalFixedIncomeForMonth,
  getFixedExpensesByCategoryForMonth,
  getFixedIncomeByCategoryForMonth,
} from "@/actions/monthly-fixed";

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
  // Month-aware fixed data (for analytics)
  monthlyFixedExpensesTotal: (year: number, month: number) =>
    `monthly-fixed-expenses-total-${year}-${month}`,
  monthlyFixedIncomeTotal: (year: number, month: number) =>
    `monthly-fixed-income-total-${year}-${month}`,
  monthlyFixedExpensesByCategory: (year: number, month: number) =>
    `monthly-fixed-expenses-by-category-${year}-${month}`,
  monthlyFixedIncomeByCategory: (year: number, month: number) =>
    `monthly-fixed-income-by-category-${year}-${month}`,
};

// Hooks
export function useCategories() {
  return useSWR(CACHE_KEYS.categories, getCategories);
}

export function useRecentTransactions() {
  return useSWR(CACHE_KEYS.recentTransactions, () => getRecentTransactions(10));
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

// Month-aware fixed data hooks (for analytics — current month uses live template, past months use snapshots)
export function useMonthlyTotalFixedExpenses(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyFixedExpensesTotal(year, month), () =>
    getTotalFixedExpensesForMonth(year, month)
  );
}

export function useMonthlyTotalFixedIncome(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyFixedIncomeTotal(year, month), () =>
    getTotalFixedIncomeForMonth(year, month)
  );
}

export function useMonthlyFixedExpensesByCategory(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyFixedExpensesByCategory(year, month), () =>
    getFixedExpensesByCategoryForMonth(year, month)
  );
}

export function useMonthlyFixedIncomeByCategory(year: number, month: number) {
  return useSWR(CACHE_KEYS.monthlyFixedIncomeByCategory(year, month), () =>
    getFixedIncomeByCategoryForMonth(year, month)
  );
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
        key === CACHE_KEYS.totalFixedExpenses ||
        key.startsWith("monthly-fixed-expenses-")),
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
        key === CACHE_KEYS.totalFixedIncome ||
        key.startsWith("monthly-fixed-income-")),
    undefined,
    { revalidate: true }
  );
}
