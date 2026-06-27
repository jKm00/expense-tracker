import { db } from "@/lib/db";
import { and, eq, gte, inArray } from "drizzle-orm";
import {
  receiptItemMappings,
  receiptScanAttempts,
} from "./receipt-scanning.schema";
import { NewReceiptItemMapping, NewReceiptScanAttempt } from "./receipt-scanning.models";

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

  return await client
    .select()
    .from(receiptItemMappings)
    .where(
      and(
        eq(receiptItemMappings.userId, userId),
        inArray(receiptItemMappings.normalizedItemName, uniqueNames),
      ),
    );
}

async function getMappingByNormalizedName(
  userId: string,
  normalizedItemName: string,
  client: DbClient = db,
) {
  const [existing] = await client
    .select()
    .from(receiptItemMappings)
    .where(
      and(
        eq(receiptItemMappings.userId, userId),
        eq(receiptItemMappings.normalizedItemName, normalizedItemName),
      ),
    )
    .limit(1);

  return existing ?? null;
}

async function saveMapping(mapping: NewReceiptItemMapping, client: DbClient = db) {
  return await client
    .insert(receiptItemMappings)
    .values(mapping)
    .returning();
}

async function updateMapping(
  mappingId: string,
  data: Partial<NewReceiptItemMapping>,
  client: DbClient = db,
) {
  return await client
    .update(receiptItemMappings)
    .set(data)
    .where(eq(receiptItemMappings.id, mappingId))
    .returning();
}

async function deleteMappingsForProduct(productId: string, client: DbClient = db) {
  return await client
    .delete(receiptItemMappings)
    .where(eq(receiptItemMappings.productId, productId))
    .returning();
}

async function getExtractionAttemptsSince(
  userId: string,
  since: Date,
  client: DbClient = db,
) {
  return await client
    .select()
    .from(receiptScanAttempts)
    .where(
      and(
        eq(receiptScanAttempts.userId, userId),
        gte(receiptScanAttempts.createdAt, since),
      ),
    );
}

async function saveAttempt(
  attempt: NewReceiptScanAttempt,
  client: DbClient = db,
) {
  return await client.insert(receiptScanAttempts).values(attempt).returning();
}

export const receiptScanningRepo = {
  getMappingsByNames,
  getMappingByNormalizedName,
  saveMapping,
  updateMapping,
  deleteMappingsForProduct,
  getExtractionAttemptsSince,
  saveAttempt,
};
