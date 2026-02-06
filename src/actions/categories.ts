"use server";

import { db } from "@/db";
import { category } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [];
  }

  return db
    .select()
    .from(category)
    .where(eq(category.userId, session.user.id))
    .orderBy(category.name);
}

export async function createCategory(name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const [newCategory] = await db
    .insert(category)
    .values({
      name,
      userId: session.user.id,
    })
    .returning();

  revalidatePath("/");
  return newCategory;
}

export async function findOrCreateCategory(name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Check if category already exists
  const existing = await db
    .select()
    .from(category)
    .where(eq(category.userId, session.user.id))
    .then((cats) =>
      cats.find((c) => c.name.toLowerCase() === name.toLowerCase())
    );

  if (existing) {
    return existing;
  }

  // Create new category
  const [newCategory] = await db
    .insert(category)
    .values({
      name,
      userId: session.user.id,
    })
    .returning();

  revalidatePath("/");
  return newCategory;
}
