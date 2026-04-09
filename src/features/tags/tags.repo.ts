import { db } from "@/lib/db";
import { NewTag } from "./tags.models";
import { tags } from "./tags.schema";

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

export const tagsRepo = {
  getAll,
  getFirst,
  getFirstByName,
  save,
};
