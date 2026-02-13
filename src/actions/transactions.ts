"use server";

import { db } from "@/db";
import { transaction, category } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOrCreateCategory } from "./categories";

export async function createTransaction(
  amount: number,
  type: "expense" | "income",
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

  const [newTransaction] = await db
    .insert(transaction)
    .values({
      amount: amount.toFixed(2),
      type,
      categoryId: cat.id,
      userId: session.user.id,
    })
    .returning();

  revalidatePath("/");
  revalidatePath("/analytics");

  return newTransaction;
}

export async function getRecentTransactions(limit = 5) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const transactions = await db
    .select({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      createdAt: transaction.createdAt,
      categoryName: category.name,
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.categoryId, category.id))
    .where(eq(transaction.userId, session.user.id))
    .orderBy(desc(transaction.createdAt))
    .limit(limit);

  return transactions;
}

export async function getTransactionsByMonth(year: number, month: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  const transactions = await db
    .select({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      createdAt: transaction.createdAt,
      categoryName: category.name,
    })
    .from(transaction)
    .innerJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.userId, session.user.id),
        gte(transaction.createdAt, startDate),
        lt(transaction.createdAt, endDate)
      )
    )
    .orderBy(desc(transaction.createdAt));

  return transactions;
}

export async function getMonthlyStats(year: number, month: number) {
  const transactions = await getTransactionsByMonth(year, month);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const categoryBreakdown = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        const existing = acc.find((c) => c.name === t.categoryName);
        const amount = parseFloat(t.amount);
        const date = t.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        
        if (existing) {
          existing.value += amount;
          // Check if an item with this date already exists
          const existingItem = existing.items.find((i) => i.date === date);
          if (existingItem) {
            existingItem.value += amount;
          } else {
            existing.items.push({
              name: date,
              value: amount,
              date,
            });
          }
        } else {
          acc.push({
            name: t.categoryName,
            value: amount,
            items: [{
              name: date,
              value: amount,
              date,
            }],
          });
        }
        return acc;
      },
      [] as { name: string; value: number; items: { name: string; value: number; date: string }[] }[]
    )
    .sort((a, b) => b.value - a.value);

  // Daily breakdown for bar chart
  const dailyBreakdown = transactions.reduce(
    (acc, t) => {
      const day = t.createdAt.getDate();
      const existing = acc.find((d) => d.day === day);
      const amount = parseFloat(t.amount);

      if (existing) {
        if (t.type === "expense") {
          existing.expenses += amount;
        } else {
          existing.income += amount;
        }
      } else {
        acc.push({
          day,
          expenses: t.type === "expense" ? amount : 0,
          income: t.type === "income" ? amount : 0,
        });
      }
      return acc;
    },
    [] as { day: number; expenses: number; income: number }[]
  );

  // Sort by day
  dailyBreakdown.sort((a, b) => a.day - b.day);

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown,
    dailyBreakdown,
    transactionCount: transactions.length,
  };
}

export async function deleteTransaction(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(transaction)
    .where(
      and(eq(transaction.id, id), eq(transaction.userId, session.user.id))
    );

  revalidatePath("/");
  revalidatePath("/analytics");
}
