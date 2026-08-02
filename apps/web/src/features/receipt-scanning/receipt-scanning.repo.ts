import { db } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  receiptItemMappings,
} from "./receipt-scanning.schema";
import { NewReceiptItemMapping } from "./receipt-scanning.models";

type DbClient = typeof db;

async function withTransaction<T>(callback: (client: DbClient) => Promise<T>) {
  return await db.transaction(async (tx) => callback(tx as DbClient));
}

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

export const receiptScanningRepo = {
  withTransaction,
  getMappingsByNames,
  getMappingByNormalizedName,
  saveMapping,
  updateMapping,
  deleteMappingsForProduct,
};
