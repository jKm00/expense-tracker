"use server";

import { db } from "@/db";
import { fixedIncome, category } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOrCreateCategory } from "./categories";

export async function getFixedIncome() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const income = await db
    .select({
      id: fixedIncome.id,
      name: fixedIncome.name,
      amount: fixedIncome.amount,
      categoryId: fixedIncome.categoryId,
      categoryName: category.name,
      createdAt: fixedIncome.createdAt,
    })
    .from(fixedIncome)
    .innerJoin(category, eq(fixedIncome.categoryId, category.id))
    .where(eq(fixedIncome.userId, session.user.id))
    .orderBy(fixedIncome.name);

  return income;
}

export async function createFixedIncome(
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

  const [newIncome] = await db
    .insert(fixedIncome)
    .values({
      name,
      amount: amount.toFixed(2),
      categoryId: cat.id,
      userId: session.user.id,
    })
    .returning();

  revalidatePath("/fixed");
  revalidatePath("/analytics");

  return newIncome;
}

export async function deleteFixedIncome(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(fixedIncome)
    .where(eq(fixedIncome.id, id));

  revalidatePath("/fixed");
  revalidatePath("/analytics");
}

export async function getTotalFixedIncome(): Promise<number> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return 0;
  }

  const income = await db
    .select({ amount: fixedIncome.amount })
    .from(fixedIncome)
    .where(eq(fixedIncome.userId, session.user.id));

  return income.reduce((sum, i) => sum + parseFloat(i.amount), 0);
}

export async function getFixedIncomeByCategory(): Promise<
  { name: string; value: number }[]
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const income = await db
    .select({
      amount: fixedIncome.amount,
      categoryName: category.name,
    })
    .from(fixedIncome)
    .innerJoin(category, eq(fixedIncome.categoryId, category.id))
    .where(eq(fixedIncome.userId, session.user.id));

  // Group by category
  const grouped = income.reduce(
    (acc, i) => {
      const existing = acc.find((c) => c.name === i.categoryName);
      if (existing) {
        existing.value += parseFloat(i.amount);
      } else {
        acc.push({ name: i.categoryName, value: parseFloat(i.amount) });
      }
      return acc;
    },
    [] as { name: string; value: number }[]
  );

  // Sort by value descending
  return grouped.sort((a, b) => b.value - a.value);
}

export interface FixedIncomeItem {
  name: string;
  value: number;
}

export interface FixedIncomeCategory {
  name: string;
  value: number;
  items: FixedIncomeItem[];
}

export async function getFixedIncomeByCategoryDetailed(): Promise<
  FixedIncomeCategory[]
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  const income = await db
    .select({
      name: fixedIncome.name,
      amount: fixedIncome.amount,
      categoryName: category.name,
    })
    .from(fixedIncome)
    .innerJoin(category, eq(fixedIncome.categoryId, category.id))
    .where(eq(fixedIncome.userId, session.user.id));

  // Group by category, keeping individual items
  const grouped = income.reduce(
    (acc, i) => {
      const existing = acc.find((c) => c.name === i.categoryName);
      if (existing) {
        existing.value += parseFloat(i.amount);
        existing.items.push({
          name: i.name,
          value: parseFloat(i.amount),
        });
      } else {
        acc.push({
          name: i.categoryName,
          value: parseFloat(i.amount),
          items: [{ name: i.name, value: parseFloat(i.amount) }],
        });
      }
      return acc;
    },
    [] as FixedIncomeCategory[]
  );

  // Sort by value descending
  return grouped.sort((a, b) => b.value - a.value);
}
