import { db } from "@/lib/db";
import { tag } from "./item.schema";
import { eq } from "drizzle-orm";
import type { Tag } from "./item.models";

export const tagRepo = {
  get: async (id: string) => {
    const res = await db.select().from(tag).where(eq(tag.id, id));

    if (res.length === 0) return undefined;

    return res[0];
  },
  getAll: async (userId: string) => {
    return await db.select().from(tag).where(eq(tag.userId, userId));
  },
  save: async (data: Omit<Tag, "id" | "createdAt" | "updatedAt">) => {
    await db.insert(tag).values(data);
  },
  update: async (
    id: string,
    data: Partial<Omit<Tag, "id" | "userId" | "createdAt" | "updatedAt">>,
  ) => {
    await db
      .update(tag)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tag.id, id));
  },
  delete: async (id: string) => {
    await db.delete(tag).where(eq(tag.id, id));
  },
};
