"use server";

import { db } from "@/db";
import { fixedExpense, category } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOrCreateCategory } from "./categories";

export async function getFixedExpenses() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const expenses = await db
    .select({
      id: fixedExpense.id,
      name: fixedExpense.name,
      amount: fixedExpense.amount,
      categoryId: fixedExpense.categoryId,
      categoryName: category.name,
      createdAt: fixedExpense.createdAt,
    })
    .from(fixedExpense)
    .innerJoin(category, eq(fixedExpense.categoryId, category.id))
    .where(eq(fixedExpense.userId, session.user.id))
    .orderBy(fixedExpense.name);

  return expenses;
}

export async function createFixedExpense(
  name: string,
  amount: number,
  categoryName: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Find or create the category
  const cat = await findOrCreateCategory(categoryName);

  const [newExpense] = await db
    .insert(fixedExpense)
    .values({
      name,
      amount: amount.toFixed(2),
      categoryId: cat.id,
      userId: session.user.id,
    })
    .returning();

  revalidatePath("/fixed");
  revalidatePath("/analytics");

  return newExpense;
}

export async function deleteFixedExpense(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(fixedExpense)
    .where(eq(fixedExpense.id, id));

  revalidatePath("/fixed");
  revalidatePath("/analytics");
}

export async function getTotalFixedExpenses(): Promise<number> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return 0;
  }

  const expenses = await db
    .select({ amount: fixedExpense.amount })
    .from(fixedExpense)
    .where(eq(fixedExpense.userId, session.user.id));

  return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
}

export async function getFixedExpensesByCategory(): Promise<
  { name: string; value: number }[]
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const expenses = await db
    .select({
      amount: fixedExpense.amount,
      categoryName: category.name,
    })
    .from(fixedExpense)
    .innerJoin(category, eq(fixedExpense.categoryId, category.id))
    .where(eq(fixedExpense.userId, session.user.id));

  // Group by category
  const grouped = expenses.reduce(
    (acc, e) => {
      const existing = acc.find((c) => c.name === e.categoryName);
      if (existing) {
        existing.value += parseFloat(e.amount);
      } else {
        acc.push({ name: e.categoryName, value: parseFloat(e.amount) });
      }
      return acc;
    },
    [] as { name: string; value: number }[]
  );

  // Sort by value descending
  return grouped.sort((a, b) => b.value - a.value);
}

export interface FixedExpenseItem {
  name: string;
  value: number;
}

export interface FixedExpenseCategory {
  name: string;
  value: number;
  items: FixedExpenseItem[];
}

export async function getFixedExpensesByCategoryDetailed(): Promise<
  FixedExpenseCategory[]
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const expenses = await db
    .select({
      name: fixedExpense.name,
      amount: fixedExpense.amount,
      categoryName: category.name,
    })
    .from(fixedExpense)
    .innerJoin(category, eq(fixedExpense.categoryId, category.id))
    .where(eq(fixedExpense.userId, session.user.id));

  // Group by category, keeping individual items
  const grouped = expenses.reduce(
    (acc, e) => {
      const existing = acc.find((c) => c.name === e.categoryName);
      if (existing) {
        existing.value += parseFloat(e.amount);
        existing.items.push({
          name: e.name,
          value: parseFloat(e.amount),
        });
      } else {
        acc.push({
          name: e.categoryName,
          value: parseFloat(e.amount),
          items: [{ name: e.name, value: parseFloat(e.amount) }],
        });
      }
      return acc;
    },
    [] as FixedExpenseCategory[]
  );

  // Sort by value descending
  return grouped.sort((a, b) => b.value - a.value);
}
