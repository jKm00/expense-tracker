import { db } from "@/lib/db";
import type { Item } from "./item.models";
import { and, eq } from "drizzle-orm";
import { item } from "./item.schema";

async function get(id: string) {
  const res = await db.select().from(item).where(eq(item.id, id));

  if (res.length === 0) return undefined;

  return res[0];
}

async function getByName(userId: string, name: string) {
  const res = await db
    .select()
    .from(item)
    .where(and(eq(item.userId, userId), eq(item.name, name)));

  if (res.length === 0) return undefined;

  return res[0];
}

async function getAll(userId: string) {
  return await db.select().from(item).where(eq(item.userId, userId));
}

async function save(data: Omit<Item, "id" | "createdAt" | "updatedAt">) {
  return (await db.insert(item).values(data).returning())[0];
}

async function update(
  id: string,
  data: Partial<Omit<Item, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  await db
    .update(item)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(item.id, id));
}

async function deleteItem(id: string) {
  await db.delete(item).where(eq(item.id, id));
}

export const itemRepo = {
  get,
  getByName,
  getAll,
  save,
  update,
  deleteItem,
};
