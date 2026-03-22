import { db } from "@/lib/db";
import { productTag, tag } from "./tag.schema";
import { and, eq } from "drizzle-orm";
import type { Tag } from "./tag.models";

async function get(id: string) {
  const res = await db.select().from(tag).where(eq(tag.id, id));
  if (res.length === 0) return undefined;
  return res[0];
}

async function getByName(userId: string, name: string) {
  return await db.query.tag.findFirst({
    where: {
      userId,
      name,
    },
  });
}

async function getAll(userId: string) {
  return await db.select().from(tag).where(eq(tag.userId, userId));
}

async function save(data: Omit<Tag, "id" | "createdAt" | "updatedAt">) {
  return (await db.insert(tag).values(data).returning())[0];
}

async function getLinkedTag(tagId: string, productId: string) {
  return await db.query.productTag.findFirst({
    where: {
      tagId,
      productId,
    },
  });
}

async function linkToProduct(tagId: string, productId: string) {
  return (
    await db
      .insert(productTag)
      .values({
        tagId,
        productId,
      })
      .returning()
  )[0];
}

async function unlinkFromProduct(tagId: string, productId: string) {
  return await db
    .delete(productTag)
    .where(
      and(eq(productTag.tagId, tagId), eq(productTag.productId, productId)),
    )
    .returning();
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
  getByName,
  getAll,
  save,
  getLinkedTag,
  linkToProduct,
  unlinkFromProduct,
  update,
  deleteTag,
};
