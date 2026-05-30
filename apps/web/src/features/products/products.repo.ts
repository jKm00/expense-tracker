import { db } from "@/lib/db";
import { products, productTags, productAliases } from "./products.schema";
import { entries, transactions } from "../transactions/transactions.schema";
import { NewProduct, UpdateProduct } from "./products.models";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  isNotNull,
  isNull as drizzleIsNull,
  or,
  sql,
  sum,
} from "drizzle-orm";

async function getAll(userId: string) {
  return await db.query.products.findMany({
    with: {
      aliases: true,
      tags: true,
    },
    where: {
      userId,
      deletedAt: { isNull: true },
    },
  });
}

async function getPage(options: {
  userId: string;
  offset: number;
  limit: number;
  group?: "tagged" | "untagged";
  search?: string;
}) {
  const searchPattern = options.search ? `%${options.search}%` : null;

  const productRows = await db
    .select({
      id: products.id,
    })
    .from(products)
    .leftJoin(productTags, eq(productTags.productId, products.id))
    .leftJoin(productAliases, eq(productAliases.productId, products.id))
    .where(
      and(
        eq(products.userId, options.userId),
        drizzleIsNull(products.deletedAt),
        options.group === "tagged"
          ? isNotNull(productTags.tagId)
          : options.group === "untagged"
            ? drizzleIsNull(productTags.tagId)
            : undefined,
        searchPattern
          ? or(
              ilike(products.name, searchPattern),
              ilike(productAliases.name, searchPattern),
            )
          : undefined,
      ),
    )
    .groupBy(products.id)
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(options.limit)
    .offset(options.offset);

  if (productRows.length === 0) {
    return [];
  }

  const pagedProducts = await db.query.products.findMany({
    with: {
      aliases: true,
      tags: true,
    },
    where: (product, { inArray }) =>
      inArray(
        product.id,
        productRows.map((row) => row.id),
      ),
  });

  const productMap = new Map(pagedProducts.map((product) => [product.id, product]));

  return productRows
    .map((row) => productMap.get(row.id))
    .filter(
      (product): product is NonNullable<(typeof pagedProducts)[number]> =>
        Boolean(product),
    );
}

async function getKpis(userId: string) {
  const [{ total }] = await db
    .select({
      total: count(products.id),
    })
    .from(products)
    .where(and(eq(products.userId, userId), isNull(products.deletedAt)));

  const [{ tagged }] = await db
    .select({
      tagged: count(sql`distinct ${products.id}`),
    })
    .from(products)
    .innerJoin(productTags, eq(productTags.productId, products.id))
    .where(and(eq(products.userId, userId), isNull(products.deletedAt)));

  return {
    total: Number(total ?? 0),
    tagged: Number(tagged ?? 0),
  };
}

async function getOne(id: string) {
  return await db.query.products.findFirst({
    with: {
      aliases: true,
      tags: true,
    },
    where: {
      id,
    },
  });
}

async function getAlias(id: string) {
  return await db.query.productAliases.findFirst({
    where: {
      id,
    },
  });
}

async function getAliasByNormalizedName(productId: string, normalizedName: string) {
  return await db.query.productAliases.findFirst({
    where: {
      productId,
      normalizedName,
    },
  });
}

async function save(product: NewProduct) {
  return await db.insert(products).values(product).returning();
}

async function saveAlias(alias: { productId: string; name: string; normalizedName: string }) {
  return await db.insert(productAliases).values(alias).returning();
}

async function updateAlias(id: string, data: { name?: string; normalizedName?: string }) {
  return await db
    .update(productAliases)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productAliases.id, id))
    .returning();
}

async function removeAlias(id: string) {
  return await db.delete(productAliases).where(eq(productAliases.id, id)).returning();
}

async function update(id: string, data: UpdateProduct) {
  return await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning();
}

async function remove(id: string) {
  return await db.delete(products).where(eq(products.id, id)).returning();
}

async function softDelete(id: string) {
  return await db
    .update(products)
    .set({ deletedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
}

async function saveTagLink(productId: string, tagId: string) {
  return await db
    .insert(productTags)
    .values({
      productId,
      tagId,
    })
    .returning();
}

async function removeTagLink(productId: string, tagId: string) {
  return await db
    .delete(productTags)
    .where(
      and(eq(productTags.productId, productId), eq(productTags.tagId, tagId)),
    )
    .returning();
}

async function getStats(productId: string) {
  const [stats] = await db
    .select({
      purchaseCount: count(entries.id),
      totalQuantity: sql<number>`coalesce(${sum(entries.quantity)}, 0)`,
      totalSpent: sql<string>`coalesce(sum(case when ${entries.type} = 'expense' then ${entries.price} * ${entries.quantity} else 0 end), 0)`,
      totalIncome: sql<string>`coalesce(sum(case when ${entries.type} = 'income' then ${entries.price} * ${entries.quantity} else 0 end), 0)`,
      lastPurchasedAt: sql<Date | null>`max(${transactions.date})`,
    })
    .from(entries)
    .innerJoin(transactions, eq(entries.transactionId, transactions.id))
    .where(eq(entries.productId, productId));

  return {
    purchaseCount: Number(stats?.purchaseCount ?? 0),
    totalQuantity: Number(stats?.totalQuantity ?? 0),
    totalSpent: String(stats?.totalSpent ?? "0"),
    totalIncome: String(stats?.totalIncome ?? "0"),
    lastPurchasedAt: stats?.lastPurchasedAt ?? null,
  };
}

export const productRepo = {
  getAll,
  getPage,
  getKpis,
  getOne,
  getStats,
  save,
  saveTagLink,
  update,
  remove,
  softDelete,
  removeTagLink,
  getAlias,
  getAliasByNormalizedName,
  saveAlias,
  updateAlias,
  removeAlias,
};
