import { db } from "@/lib/db";
import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { productRepo } from "../products/products.repo";
import { products } from "../products/products.schema";
import { shoppingRepo } from "../shopping/shopping.repo";
import { entries, entryTags, transactions } from "../transactions/transactions.schema";
import { tags } from "../tags/tags.schema";
import { shoppingListItems, shoppingLists } from "../shopping/shopping.schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  CompleteReceiptCheckoutScanDTO,
  CompleteReceiptTransactionReplacementScanDTO,
  CompleteReceiptTransactionScanDTO,
} from "./receipt-scanning.dtos";
import { matchReceiptToProducts } from "./receipt-matching";
import { normalizeReceiptName } from "./receipt-normalization";
import { receiptScanningRepo } from "./receipt-scanning.repo";
import { extractReceiptWithOpenAI } from "./receipt-openai.adapter";
import { receiptItemMappings } from "./receipt-scanning.schema";

const MAX_SCANS_PER_HOUR = 20;

type DbClient = typeof db;

function calculateTotalPrice(entriesInput: Array<{ price: string; quantity: string }>) {
  return entriesInput.reduce((sum, entry) => {
    return sum - Number(entry.price) * Number(entry.quantity);
  }, 0);
}

function categorizeError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("OPENAI_API_KEY")) return "configuration";
    if (error.message.includes("OPENAI_HTTP")) return "provider_http";
    if (error.message.includes("OPENAI_RESPONSE")) return "provider_response";
  }

  return "unexpected";
}

function parseExtractedDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

async function assertRateLimit(userId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const attempts = await receiptScanningRepo.countRecentAttempts(userId, oneHourAgo);
  return attempts < MAX_SCANS_PER_HOUR;
}

async function extractReceipt(userId: string, input: { imageDataUrl: string; mode: "transaction" | "shopping-checkout" }) {
  const startedAt = Date.now();
  const allowed = await assertRateLimit(userId);
  if (!allowed) {
    await receiptScanningRepo.saveAttempt({
      userId,
      provider: "openai",
      status: "rate_limited",
      durationMs: Date.now() - startedAt,
      errorCategory: "rate_limit",
    });

    return err({
      reason: "SCAN_RATE_LIMITED" as const,
      message: "You have scanned too many receipts recently. Please try again later.",
    });
  }

  try {
    const receipt = await extractReceiptWithOpenAI(input.imageDataUrl);
    const products = await productRepo.getAll(userId);
    const normalizedNames = receipt.items.map((item) => normalizeReceiptName(item.name));
    const mappings = await receiptScanningRepo.getMappingsByNames(
      userId,
      normalizedNames,
    );
    const shoppingList =
      input.mode === "shopping-checkout"
        ? await shoppingRepo.getOrCreateShoppingList(userId)
        : null;

    await receiptScanningRepo.saveAttempt({
      userId,
      provider: "openai",
      status: "success",
      itemCount: receipt.items.length,
      durationMs: Date.now() - startedAt,
    });

    return ok({
      ...matchReceiptToProducts({
        receipt,
        products,
        mappings,
        shoppingItems: shoppingList?.items,
      }),
      parsedDate: parseExtractedDate(receipt.date),
    });
  } catch (error) {
    await receiptScanningRepo.saveAttempt({
      userId,
      provider: "openai",
      status: "failed",
      durationMs: Date.now() - startedAt,
      errorCategory: categorizeError(error),
    });

    return err({
      reason: "SCAN_EXTRACTION_FAILED" as const,
      message: "Failed to extract receipt details. Please try again or use manual entry.",
    });
  }
}

async function getOwnedProduct(
  client: DbClient,
  userId: string,
  productId: string,
) {
  const [product] = await client
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.userId, userId),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);

  return product ?? null;
}

async function resolveProduct(
  client: DbClient,
  userId: string,
  product: { id: string | null; name: string },
) {
  if (product.id) {
    const existing = await getOwnedProduct(client, userId, product.id);
    if (!existing) {
      throw new Error("SCAN_PRODUCT_NOT_FOUND");
    }
    return existing;
  }

  const [created] = await client
    .insert(products)
    .values({ userId, name: product.name.trim() })
    .returning();

  if (!created) {
    throw new Error("SCAN_PRODUCT_CREATE_FAILED");
  }

  return created;
}

async function assertTagsOwned(
  client: DbClient,
  userId: string,
  tagIds: string[],
) {
  const uniqueTagIds = Array.from(new Set(tagIds));
  if (uniqueTagIds.length === 0) {
    return;
  }

  const ownedTags = await client
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, uniqueTagIds)));

  if (ownedTags.length !== uniqueTagIds.length) {
    throw new Error("SCAN_TAG_UNAUTHORIZED");
  }
}

async function upsertMappingInTransaction(
  client: DbClient,
  input: {
    userId: string;
    productId: string;
    itemName: string;
  },
) {
  const normalizedItemName = normalizeReceiptName(input.itemName);
  if (!normalizedItemName) {
    return;
  }

  const [existing] = await client
    .select()
    .from(receiptItemMappings)
    .where(
      and(
        eq(receiptItemMappings.userId, input.userId),
        eq(receiptItemMappings.normalizedItemName, normalizedItemName),
      ),
    )
    .limit(1);

  const now = new Date();
  if (existing) {
    await client
      .update(receiptItemMappings)
      .set({
        productId: input.productId,
        itemName: input.itemName,
        normalizedItemName,
        confirmationCount: existing.confirmationCount + 1,
        lastConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(receiptItemMappings.id, existing.id));
    return;
  }

  await client.insert(receiptItemMappings).values({
    userId: input.userId,
    productId: input.productId,
    itemName: input.itemName,
    normalizedItemName,
    confirmationCount: 1,
    lastConfirmedAt: now,
  });
}

async function saveEntriesAndMappings(
  client: DbClient,
  userId: string,
  transactionId: string,
  scanEntries: CompleteReceiptTransactionScanDTO["entries"],
) {
  for (const scanEntry of scanEntries) {
    const product = await resolveProduct(client, userId, scanEntry.product);
    const tagIds = Array.from(new Set(scanEntry.tagIds ?? []));
    await assertTagsOwned(client, userId, tagIds);

    const [entry] = await client
      .insert(entries)
      .values({
        transactionId,
        productId: product.id,
        price: scanEntry.price,
        quantity: Number(scanEntry.quantity),
        type: "expense",
      })
      .returning();

    if (!entry) {
      throw new Error("SCAN_ENTRY_CREATE_FAILED");
    }

    for (const tagId of tagIds) {
      await client.insert(entryTags).values({ entryId: entry.id, tagId });
    }

    await upsertMappingInTransaction(client, {
      userId,
      productId: product.id,
      itemName: scanEntry.receiptItemName,
    });
  }
}

async function completeTransactionScan(
  userId: string,
  data: CompleteReceiptTransactionScanDTO,
) {
  try {
    const transaction = await db.transaction(async (tx) => {
      const totalPrice = calculateTotalPrice(data.entries);
      const [savedTransaction] = await tx
        .insert(transactions)
        .values({
          userId,
          store: data.store,
          description: data.description,
          date: data.date,
          source: "scan",
          needsReview: false,
          totalPrice: String(totalPrice),
        })
        .returning();

      if (!savedTransaction) {
        throw new Error("SCAN_TRANSACTION_CREATE_FAILED");
      }

      await saveEntriesAndMappings(tx as DbClient, userId, savedTransaction.id, data.entries);
      return savedTransaction;
    });

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to save scanned transaction. Please try again.",
    });
  }
}

async function completeTransactionReplacementScan(
  userId: string,
  data: CompleteReceiptTransactionReplacementScanDTO,
) {
  try {
    const transaction = await db.transaction(async (tx) => {
      const existingTransaction = await getOwnedTransaction(
        tx as DbClient,
        userId,
        data.transactionId,
      );
      if (!existingTransaction) {
        throw new Error("SCAN_TRANSACTION_NOT_FOUND");
      }
      if (existingTransaction.source === "recurring") {
        throw new Error("SCAN_TRANSACTION_RECURRING_NOT_ALLOWED");
      }

      const incomeEntries = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.transactionId, data.transactionId),
            eq(entries.type, "income"),
          ),
        )
        .limit(1);
      if (incomeEntries.length > 0) {
        throw new Error("SCAN_TRANSACTION_INCOME_NOT_ALLOWED");
      }

      const totalPrice = calculateTotalPrice(data.entries);
      const [updated] = await tx
        .update(transactions)
        .set({
          store: existingTransaction.store ?? data.store ?? null,
          needsReview: false,
          totalPrice: String(totalPrice),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, data.transactionId))
        .returning();

      if (!updated) {
        throw new Error("SCAN_TRANSACTION_UPDATE_FAILED");
      }

      await tx.delete(entries).where(eq(entries.transactionId, data.transactionId));
      await saveEntriesAndMappings(tx as DbClient, userId, updated.id, data.entries);
      return updated;
    });

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to replace transaction with scanned receipt. Please try again.",
    });
  }
}

async function getOwnedShoppingList(client: DbClient, userId: string) {
  const [list] = await client
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .limit(1);

  return list ?? null;
}

async function getOwnedTransaction(
  client: DbClient,
  userId: string,
  transactionId: string,
) {
  const [transaction] = await client
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1);

  return transaction ?? null;
}

async function completeCheckoutScan(
  userId: string,
  data: CompleteReceiptCheckoutScanDTO,
) {
  try {
    const transaction = await db.transaction(async (tx) => {
      const totalPrice = calculateTotalPrice(data.entries);
      const [savedTransaction] = await tx
        .insert(transactions)
        .values({
          userId,
          store: data.store,
          description: data.description,
          date: data.date,
          source: "shopping",
          needsReview: false,
          totalPrice: String(totalPrice),
        })
        .returning();

      if (!savedTransaction) {
        throw new Error("SCAN_TRANSACTION_CREATE_FAILED");
      }

      await saveEntriesAndMappings(tx as DbClient, userId, savedTransaction.id, data.entries);

      const shoppingItemIds = Array.from(
        new Set(data.entries.flatMap((entry) => entry.shoppingItemId ? [entry.shoppingItemId] : [])),
      );
      const list = await getOwnedShoppingList(tx as DbClient, userId);
      if (list && shoppingItemIds.length > 0) {
        await tx
          .delete(shoppingListItems)
          .where(
            and(
              eq(shoppingListItems.shoppingListId, list.id),
              inArray(shoppingListItems.id, shoppingItemIds),
            ),
          );
        await tx
          .update(shoppingLists)
          .set({ updatedAt: new Date() })
          .where(eq(shoppingLists.id, list.id));
      }

      return savedTransaction;
    });

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to complete scanned checkout. Please try again.",
    });
  }
}

async function deleteMappingsForProduct(productId: string) {
  return await receiptScanningRepo.deleteMappingsForProduct(productId);
}

export const receiptScanningService = {
  extractReceipt,
  completeTransactionScan,
  completeTransactionReplacementScan,
  completeCheckoutScan,
  deleteMappingsForProduct,
};
