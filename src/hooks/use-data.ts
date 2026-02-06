"use client";

import useSWR, { mutate } from "swr";
import {
  getRecentTransactions,
  getTransactionsByMonth,
  getMonthlyStats,
} from "@/actions/transactions";
import { getCategories } from "@/actions/categories";

// Cache keys
export const CACHE_KEYS = {
  categories: "categories",
  recentTransactions: "recent-transactions",
  monthlyTransactions: (year: number, month: number) =>
    `transactions-${year}-${month}`,
  monthlyStats: (year: number, month: number) => `stats-${year}-${month}`,
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
