import { db } from "@/lib/db";
import { products } from "@/features/products/products.schema";
import { and, count, eq, gte, inArray, isNull } from "drizzle-orm";
import {
  receiptItemMappings,
  receiptScanAttempts,
} from "./receipt-scanning.schema";
import { NewReceiptScanAttempt } from "./receipt-scanning.models";

type DbClient = typeof db;

async function getMappingsByNames(
  userId: string,
  normalizedItemNames: string[],
  client: DbClient = db,
) {
  const uniqueNames = Array.from(new Set(normalizedItemNames)).filter(Boolean);
  if (uniqueNames.length === 0) {
    return [];
  }

  const rows = await client
    .select({ mapping: receiptItemMappings, product: products })
    .from(receiptItemMappings)
    .innerJoin(products, eq(receiptItemMappings.productId, products.id))
    .where(
      and(
        eq(receiptItemMappings.userId, userId),
        inArray(receiptItemMappings.normalizedItemName, uniqueNames),
        isNull(products.deletedAt),
      ),
    );

  return rows.map(({ mapping, product }) => ({
    ...mapping,
    product: {
      ...product,
      tags: [],
      aliases: [],
    },
  }));
}

async function upsertMapping(
  input: {
    userId: string;
    productId: string;
    itemName: string;
    normalizedItemName: string;
  },
  client: DbClient = db,
) {
  const [existing] = await client
    .select()
    .from(receiptItemMappings)
    .where(
      and(
        eq(receiptItemMappings.userId, input.userId),
        eq(receiptItemMappings.normalizedItemName, input.normalizedItemName),
      ),
    )
    .limit(1);

  const now = new Date();
  if (existing) {
    return await client
      .update(receiptItemMappings)
      .set({
        productId: input.productId,
        itemName: input.itemName,
        confirmationCount: existing.confirmationCount + 1,
        lastConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(receiptItemMappings.id, existing.id))
      .returning();
  }

  return await client
    .insert(receiptItemMappings)
    .values({
      userId: input.userId,
      productId: input.productId,
      itemName: input.itemName,
      normalizedItemName: input.normalizedItemName,
      confirmationCount: 1,
      lastConfirmedAt: now,
    })
    .returning();
}

async function deleteMappingsForProduct(productId: string, client: DbClient = db) {
  return await client
    .delete(receiptItemMappings)
    .where(eq(receiptItemMappings.productId, productId))
    .returning();
}

async function countRecentAttempts(
  userId: string,
  since: Date,
  client: DbClient = db,
) {
  const [{ total }] = await client
    .select({ total: count(receiptScanAttempts.id) })
    .from(receiptScanAttempts)
    .where(
      and(
        eq(receiptScanAttempts.userId, userId),
        gte(receiptScanAttempts.createdAt, since),
      ),
    );

  return Number(total ?? 0);
}

async function saveAttempt(
  attempt: NewReceiptScanAttempt,
  client: DbClient = db,
) {
  return await client.insert(receiptScanAttempts).values(attempt).returning();
}

export const receiptScanningRepo = {
  getMappingsByNames,
  upsertMapping,
  deleteMappingsForProduct,
  countRecentAttempts,
  saveAttempt,
};
