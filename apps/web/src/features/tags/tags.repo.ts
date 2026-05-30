import { db } from "@/lib/db";
import { NewTag, UpdateTag } from "./tags.models";
import { tags } from "./tags.schema";
import { productTags } from "../products/products.schema";
import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";

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

async function getPage(options: {
  userId: string;
  offset: number;
  limit: number;
  search?: string;
}) {
  const referenceCount = sql<number>`count(${productTags.productId})::int`;
  const searchPattern = options.search ? `%${options.search}%` : null;

  const tagRows = await db
    .select({
      id: tags.id,
      referenceCount,
    })
    .from(tags)
    .leftJoin(productTags, eq(productTags.tagId, tags.id))
    .where(
      and(
        eq(tags.userId, options.userId),
        searchPattern ? ilike(tags.name, searchPattern) : undefined,
      ),
    )
    .groupBy(tags.id)
    .orderBy(desc(referenceCount), desc(tags.createdAt), desc(tags.id))
    .limit(options.limit)
    .offset(options.offset);

  if (tagRows.length === 0) {
    return [];
  }

  const pagedTags = await db.query.tags.findMany({
    with: {
      products: true,
    },
    where: (tag, { inArray }) => inArray(tag.id, tagRows.map((row) => row.id)),
  });

  const tagMap = new Map(pagedTags.map((tag) => [tag.id, tag]));

  return tagRows
    .map((row) => tagMap.get(row.id))
    .filter((tag): tag is NonNullable<(typeof pagedTags)[number]> => Boolean(tag));
}

async function getKpis(userId: string) {
  const referenceCount = sql<number>`count(${productTags.productId})::int`;

  const [summary] = await db
    .select({
      count: count(tags.id),
      totalReferences: sql<number>`coalesce(sum(ref_counts.reference_count), 0)`,
    })
    .from(tags)
    .leftJoin(
      sql`(
        select ${productTags.tagId} as tag_id, count(${productTags.productId})::int as reference_count
        from ${productTags}
        group by ${productTags.tagId}
      ) as ref_counts`,
      sql`ref_counts.tag_id = ${tags.id}`,
    )
    .where(eq(tags.userId, userId));

  const [mostUsed] = await db
    .select({
      name: tags.name,
    })
    .from(tags)
    .leftJoin(productTags, eq(productTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(desc(referenceCount), desc(tags.createdAt), desc(tags.id))
    .limit(1);

  return {
    count: Number(summary?.count ?? 0),
    totalReferences: Number(summary?.totalReferences ?? 0),
    mostUsedTagName: mostUsed?.name ?? null,
  };
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

async function update(id: string, data: UpdateTag) {
  return await db
    .update(tags)
    .set(data)
    .where(eq(tags.id, id))
    .returning();
}

async function remove(tagId: string) {
  return await db.delete(tags).where(eq(tags.id, tagId)).returning();
}

export const tagsRepo = {
  getAll,
  getPage,
  getKpis,
  getFirst,
  getFirstByName,
  save,
  update,
  remove,
};
