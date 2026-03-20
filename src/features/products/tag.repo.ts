import { db } from "@/lib/db";
import { tag } from "./product.schema";
import { eq } from "drizzle-orm";
import type { Tag } from "./tag.models";

async function get(id: string) {
  const res = await db.select().from(tag).where(eq(tag.id, id));
  if (res.length === 0) return undefined;
  return res[0];
}

async function getAll(userId: string) {
  return await db.select().from(tag).where(eq(tag.userId, userId));
}

async function save(data: Omit<Tag, "id" | "createdAt" | "updatedAt">) {
  return await db.insert(tag).values(data);
}

async function update(
  id: string,
  data: Partial<Omit<Tag, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  return await db
    .update(tag)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tag.id, id));
}

async function deleteTag(id: string) {
  return await db.delete(tag).where(eq(tag.id, id));
}

export const tagRepo = {
  get,
  getAll,
  save,
  update,
  deleteTag,
};
