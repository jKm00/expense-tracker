import { db } from "@/lib/db";
import { NewTag } from "./tags.models";
import { tags } from "./tags.schema";
import { eq } from "drizzle-orm";

async function getAll(userId: string) {
  return await db.query.tags.findMany({
    with: {
      products: true,
    },
    where: {
      userId,
    },
  });
}

async function getFirst(id: string) {
  return await db.query.tags.findFirst({
    with: {
      products: true,
    },
    where: {
      id,
    },
  });
}

async function getFirstByName(userId: string, tagName: string) {
  return await db.query.tags.findFirst({
    with: {
      products: true,
    },
    where: {
      userId,
      name: tagName,
    },
  });
}

async function save(tag: NewTag) {
  return await db.insert(tags).values(tag).returning();
}

async function remove(tagId: string) {
  return await db.delete(tags).where(eq(tags.id, tagId)).returning();
}

export const tagsRepo = {
  getAll,
  getFirst,
  getFirstByName,
  save,
  remove,
};
