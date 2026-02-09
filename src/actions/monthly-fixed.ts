"use server";

import { db } from "@/db";
import {
  monthlyFixedSnapshot,
  fixedExpense,
  fixedIncome,
  category,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

// Shared interfaces matching existing FixedExpenseCategory/FixedIncomeCategory shape
export interface FixedItemDetail {
  name: string;
  value: number;
}

export interface FixedCategoryGroup {
  name: string;
  value: number;
  items: FixedItemDetail[];
}

/**
 * Check if we're asking for the current month.
 * Current month = live template data from fixed_expense / fixed_income tables.
 * Past month = snapshot data (created on app open at month boundary).
 */
function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth();
}

/**
 * Check if a snapshot already exists for a given user/year/month.
 */
async function snapshotExists(
  userId: string,
  year: number,
  month: number
): Promise<boolean> {
  const existing = await db
    .select({ id: monthlyFixedSnapshot.id })
    .from(monthlyFixedSnapshot)
    .where(
      and(
        eq(monthlyFixedSnapshot.userId, userId),
        eq(monthlyFixedSnapshot.year, year),
        eq(monthlyFixedSnapshot.month, month)
      )
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Create a snapshot for a past month by copying the current fixed template.
 * Called once at month boundary when the app is first opened in a new month.
 */
async function createSnapshot(
  userId: string,
  year: number,
  month: number
): Promise<void> {
  // Get all current fixed expenses
  const expenses = await db
    .select({
      name: fixedExpense.name,
      amount: fixedExpense.amount,
      categoryId: fixedExpense.categoryId,
    })
    .from(fixedExpense)
    .where(eq(fixedExpense.userId, userId));

  // Get all current fixed income
  const income = await db
    .select({
      name: fixedIncome.name,
      amount: fixedIncome.amount,
      categoryId: fixedIncome.categoryId,
    })
    .from(fixedIncome)
    .where(eq(fixedIncome.userId, userId));

  // Build snapshot rows
  const snapshotRows = [
    ...expenses.map((e) => ({
      userId,
      year,
      month,
      type: "expense" as const,
      name: e.name,
      amount: e.amount,
      categoryId: e.categoryId,
    })),
    ...income.map((i) => ({
      userId,
      year,
      month,
      type: "income" as const,
      name: i.name,
      amount: i.amount,
      categoryId: i.categoryId,
    })),
  ];

  if (snapshotRows.length > 0) {
    await db.insert(monthlyFixedSnapshot).values(snapshotRows);
  }
}

// ─── Public API: Snapshot Creation ─────────────────────────────────────────────

/**
 * Ensure the previous month has a snapshot. Called on app open (home page mount).
 * If no snapshot exists for last month, creates one from the current template.
 * This is idempotent — subsequent calls in the same month are no-ops.
 */
export async function ensurePreviousMonthSnapshot(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return false;

  const now = new Date();
  // Previous month: handle January → December of previous year
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const exists = await snapshotExists(session.user.id, prevYear, prevMonth);
  if (exists) return false;

  await createSnapshot(session.user.id, prevYear, prevMonth);
  return true;
}

// ─── Snapshot Queries ──────────────────────────────────────────────────────────

/**
 * Get snapshot entries for a specific month/type, joined with category names.
 */
async function getSnapshotEntries(
  userId: string,
  year: number,
  month: number,
  type: "expense" | "income"
) {
  return db
    .select({
      name: monthlyFixedSnapshot.name,
      amount: monthlyFixedSnapshot.amount,
      categoryName: category.name,
    })
    .from(monthlyFixedSnapshot)
    .innerJoin(
      category,
      eq(monthlyFixedSnapshot.categoryId, category.id)
    )
    .where(
      and(
        eq(monthlyFixedSnapshot.userId, userId),
        eq(monthlyFixedSnapshot.year, year),
        eq(monthlyFixedSnapshot.month, month),
        eq(monthlyFixedSnapshot.type, type)
      )
    );
}

// ─── Public API: Month-Aware Fixed Data ────────────────────────────────────────

/**
 * Get total fixed expenses for a given month.
 * Current month → live template. Past month → snapshot.
 */
export async function getTotalFixedExpensesForMonth(
  year: number,
  month: number
): Promise<number> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return 0;

  if (isCurrentMonth(year, month)) {
    // Current month: sum from live template
    const expenses = await db
      .select({ amount: fixedExpense.amount })
      .from(fixedExpense)
      .where(eq(fixedExpense.userId, session.user.id));
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }

  // Past month: read from snapshot (empty if no snapshot was created)
  const entries = await getSnapshotEntries(
    session.user.id,
    year,
    month,
    "expense"
  );
  return entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
}

/**
 * Get total fixed income for a given month.
 * Current month → live template. Past month → snapshot.
 */
export async function getTotalFixedIncomeForMonth(
  year: number,
  month: number
): Promise<number> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return 0;

  if (isCurrentMonth(year, month)) {
    const income = await db
      .select({ amount: fixedIncome.amount })
      .from(fixedIncome)
      .where(eq(fixedIncome.userId, session.user.id));
    return income.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  }

  // Past month: read from snapshot (empty if no snapshot was created)
  const entries = await getSnapshotEntries(
    session.user.id,
    year,
    month,
    "income"
  );
  return entries.reduce((sum, i) => sum + parseFloat(i.amount), 0);
}

/**
 * Get fixed expenses grouped by category (with individual items) for a given month.
 * Returns the same shape as FixedExpenseCategory[] for chart compatibility.
 */
export async function getFixedExpensesByCategoryForMonth(
  year: number,
  month: number
): Promise<FixedCategoryGroup[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return [];

  let entries: { name: string; amount: string; categoryName: string }[];

  if (isCurrentMonth(year, month)) {
    // Current month: read from live template
    entries = await db
      .select({
        name: fixedExpense.name,
        amount: fixedExpense.amount,
        categoryName: category.name,
      })
      .from(fixedExpense)
      .innerJoin(category, eq(fixedExpense.categoryId, category.id))
      .where(eq(fixedExpense.userId, session.user.id));
  } else {
    // Past month: read from snapshot (empty if no snapshot was created)
    entries = await getSnapshotEntries(
      session.user.id,
      year,
      month,
      "expense"
    );
  }

  return groupByCategory(entries);
}

/**
 * Get fixed income grouped by category (with individual items) for a given month.
 * Returns the same shape as FixedIncomeCategory[] for chart compatibility.
 */
export async function getFixedIncomeByCategoryForMonth(
  year: number,
  month: number
): Promise<FixedCategoryGroup[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return [];

  let entries: { name: string; amount: string; categoryName: string }[];

  if (isCurrentMonth(year, month)) {
    entries = await db
      .select({
        name: fixedIncome.name,
        amount: fixedIncome.amount,
        categoryName: category.name,
      })
      .from(fixedIncome)
      .innerJoin(category, eq(fixedIncome.categoryId, category.id))
      .where(eq(fixedIncome.userId, session.user.id));
  } else {
    // Past month: read from snapshot (empty if no snapshot was created)
    entries = await getSnapshotEntries(
      session.user.id,
      year,
      month,
      "income"
    );
  }

  return groupByCategory(entries);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function groupByCategory(
  entries: { name: string; amount: string; categoryName: string }[]
): FixedCategoryGroup[] {
  const grouped = entries.reduce(
    (acc, e) => {
      const existing = acc.find((c) => c.name === e.categoryName);
      const amount = parseFloat(e.amount);
      if (existing) {
        existing.value += amount;
        existing.items.push({ name: e.name, value: amount });
      } else {
        acc.push({
          name: e.categoryName,
          value: amount,
          items: [{ name: e.name, value: amount }],
        });
      }
      return acc;
    },
    [] as FixedCategoryGroup[]
  );

  return grouped.sort((a, b) => b.value - a.value);
}
