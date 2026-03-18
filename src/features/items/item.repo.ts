import { db } from "@/lib/db";
import type { Item } from "./item.models";
import { eq } from "drizzle-orm";
import { item } from "./item.schema";

async function get(id: string) {
  const res = await db.select().from(item).where(eq(item.id, id));

  if (res.length === 0) return undefined;

  return res[0];
}

async function getAll(userId: string) {
  return await db.select().from(item).where(eq(item.userId, userId));
}

async function save(data: Omit<Item, "id" | "createdAt" | "updatedAt">) {
  await db.insert(item).values(data);
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
  getAll,
  save,
  update,
  deleteItem,
};
