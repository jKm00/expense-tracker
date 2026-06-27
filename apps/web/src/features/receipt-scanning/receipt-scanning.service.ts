import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { productService } from "../products/products.service";
import { shoppingService } from "../shopping/shopping.service";
import { transactionService } from "../transactions/transactions.service";
import {
  CompleteReceiptCheckoutScanDTO,
  CompleteReceiptTransactionReplacementScanDTO,
  CompleteReceiptTransactionScanDTO,
  ReceiptScanSubmitEntryDTO,
} from "./receipt-scanning.dtos";
import { matchReceiptToProducts } from "./receipt-matching";
import { normalizeReceiptName } from "./receipt-normalization";
import { receiptScanningRepo } from "./receipt-scanning.repo";
import { extractReceiptWithOpenAI } from "./receipt-openai.adapter";
import { receiptMappingsService } from "./receipt-mappings.service";

const RECEIPT_SCAN_DAILY_LIMIT = 5;
const IN_PROGRESS_ATTEMPT_TTL_MS = 15 * 60 * 1000;

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

function getStartOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function getInProgressCutoff() {
  return new Date(Date.now() - IN_PROGRESS_ATTEMPT_TTL_MS);
}

function getDailyLockKey(startOfDay: Date) {
  return startOfDay.toISOString().slice(0, 10);
}

function isCountedAttempt(attempt: {
  status: "in_progress" | "success" | "failed" | "rate_limited" | "rejected";
  createdAt: Date;
}) {
  if (attempt.status === "success") {
    return true;
  }

  if (attempt.status === "in_progress") {
    return attempt.createdAt >= getInProgressCutoff();
  }

  return false;
}

function countDailyAttempts(attempts: Array<Parameters<typeof isCountedAttempt>[0]>) {
  return attempts.filter(isCountedAttempt).length;
}

async function getScanUsage(userId: string) {
  const attempts = await receiptScanningRepo.getExtractionAttemptsSince(userId, getStartOfToday());
  const used = countDailyAttempts(attempts);

  return ok({
    used,
    limit: RECEIPT_SCAN_DAILY_LIMIT,
    remaining: Math.max(0, RECEIPT_SCAN_DAILY_LIMIT - used),
  });
}

async function getShoppingListOrThrow(userId: string) {
  const [shoppingError, shoppingList] = await shoppingService.getShoppingList(userId);
  if (shoppingError || !shoppingList) {
    throw new Error("SCAN_SHOPPING_LIST_LOAD_FAILED");
  }

  return shoppingList;
}

async function reserveExtractionAttempt(userId: string) {
  const startOfDay = getStartOfToday();
  const dayKey = getDailyLockKey(startOfDay);

  return await receiptScanningRepo.withTransaction(async (tx) => {
    await receiptScanningRepo.lockDailyAttempts(userId, dayKey, tx);

    const attempts = await receiptScanningRepo.getExtractionAttemptsSince(
      userId,
      startOfDay,
      tx,
    );
    const used = countDailyAttempts(attempts);
    if (used >= RECEIPT_SCAN_DAILY_LIMIT) {
      try {
        await receiptScanningRepo.saveAttempt(
          {
            userId,
            provider: "openai",
            status: "rate_limited",
            durationMs: 0,
            errorCategory: "rate_limit",
          },
          tx,
        );
      } catch {
        // The quota decision is already made; denied-attempt logging is best-effort.
      }

      return null;
    }

    const [attempt] = await receiptScanningRepo.saveAttempt(
      {
        userId,
        provider: "openai",
        status: "in_progress",
      },
      tx,
    );

    if (!attempt) {
      throw new Error("SCAN_ATTEMPT_CREATE_FAILED");
    }

    return attempt;
  });
}

async function updateExtractionAttempt(
  attemptId: string,
  data: {
    status: "success" | "failed";
    itemCount?: number;
    durationMs: number;
    errorCategory?: string;
  },
) {
  try {
    await receiptScanningRepo.updateAttempt(attemptId, data);
  } catch {
    // Final status updates are best-effort; do not override the scan outcome.
  }
}

async function extractReceipt(userId: string, input: { imageDataUrl: string; mode: "transaction" | "shopping-checkout" }) {
  const startedAt = Date.now();
  let attempt: Awaited<ReturnType<typeof reserveExtractionAttempt>>;
  try {
    attempt = await reserveExtractionAttempt(userId);
  } catch {
    return err({
      reason: "SCAN_EXTRACTION_FAILED" as const,
      message: "Failed to extract receipt details. Please try again or use manual entry.",
    });
  }

  if (!attempt) {
    return err({
      reason: "SCAN_RATE_LIMITED" as const,
      message: "Receipt scanning is limited to 5 extraction attempts per day. Try again tomorrow.",
    });
  }

  try {
    const receipt = await extractReceiptWithOpenAI(input.imageDataUrl);
    const [productsError, products] = await productService.getProducts(userId);
    if (productsError) {
      throw new Error("SCAN_PRODUCTS_LOAD_FAILED");
    }

    const normalizedNames = receipt.items.map((item) => normalizeReceiptName(item.name));
    const mappings = await receiptScanningRepo.getMappingsByNames(
      userId,
      normalizedNames,
    );
    const productsById = new Map(products.map((product) => [product.id, product]));
    const mappingsWithProducts = mappings.map((mapping) => ({
      ...mapping,
      product: productsById.get(mapping.productId) ?? null,
    }));
    const shoppingList =
      input.mode === "shopping-checkout"
        ? await getShoppingListOrThrow(userId)
        : null;

    const result = {
      ...matchReceiptToProducts({
        receipt,
        products,
        mappings: mappingsWithProducts,
        shoppingItems: shoppingList?.items,
      }),
      parsedDate: parseExtractedDate(receipt.date),
    };

    await updateExtractionAttempt(attempt.id, {
      status: "success",
      itemCount: receipt.items.length,
      durationMs: Date.now() - startedAt,
    });

    return ok(result);
  } catch (error) {
    await updateExtractionAttempt(attempt.id, {
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

async function resolveProduct(
  userId: string,
  product: { id: string | null; name: string },
) {
  if (product.id) {
    const [productError, existing] = await productService.getProduct(userId, product.id);
    if (productError || !existing) {
      throw new Error("SCAN_PRODUCT_NOT_FOUND");
    }
    return existing;
  }

  const [productError, created] = await productService.addProduct({
    userId,
    name: product.name.trim(),
  });
  if (productError || !created) {
    throw new Error("SCAN_PRODUCT_CREATE_FAILED");
  }

  return created;
}

async function resolveEntries(
  userId: string,
  scanEntries: Array<ReceiptScanSubmitEntryDTO>,
) {
  const resolved = [];

  for (const scanEntry of scanEntries) {
    const product = await resolveProduct(userId, scanEntry.product);
    resolved.push({
      ...scanEntry,
      product: {
        id: product.id,
        name: product.name,
      },
    });
  }

  return resolved;
}

async function saveMappings(
  userId: string,
  entries: Awaited<ReturnType<typeof resolveEntries>>,
) {
  for (const entry of entries) {
    await receiptMappingsService.upsertMapping({
      userId,
      productId: entry.product.id,
      itemName: entry.receiptItemName,
    });
  }
}

async function completeTransactionScan(
  userId: string,
  data: CompleteReceiptTransactionScanDTO,
) {
  try {
    const entries = await resolveEntries(userId, data.entries);
    const [transactionError, transaction] = await transactionService.saveTransaction({
      transaction: {
        userId,
        store: data.store,
        description: data.description,
        date: data.date,
        source: "scan",
        needsReview: false,
      },
      entries,
    });

    if (transactionError || !transaction) {
      throw new Error("SCAN_TRANSACTION_CREATE_FAILED");
    }

    await saveMappings(userId, entries);

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
    const [existingError, existingTransaction] = await transactionService.getTransaction(
      userId,
      data.transactionId,
    );
    if (existingError || !existingTransaction) {
      throw new Error("SCAN_TRANSACTION_NOT_FOUND");
    }
    if (existingTransaction.source === "recurring") {
      throw new Error("SCAN_TRANSACTION_RECURRING_NOT_ALLOWED");
    }
    if (existingTransaction.entries.some((entry) => entry.type === "income")) {
      throw new Error("SCAN_TRANSACTION_INCOME_NOT_ALLOWED");
    }

    const entries = await resolveEntries(userId, data.entries);
    const [transactionError, transaction] = await transactionService.updateTransaction(
      userId,
      data.transactionId,
      {
        transaction: {
          store: existingTransaction.store ?? data.store ?? null,
          needsReview: false,
        },
        entries,
      },
    );

    if (transactionError || !transaction) {
      throw new Error("SCAN_TRANSACTION_UPDATE_FAILED");
    }

    await saveMappings(userId, entries);

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to replace transaction with scanned receipt. Please try again.",
    });
  }
}

async function completeCheckoutScan(
  userId: string,
  data: CompleteReceiptCheckoutScanDTO,
) {
  try {
    const entries = await resolveEntries(userId, data.entries);
    const [transactionError, transaction] = await transactionService.saveTransaction({
      transaction: {
        userId,
        store: data.store,
        description: data.description,
        date: data.date,
        source: "shopping",
        needsReview: false,
      },
      entries,
    });

    if (transactionError || !transaction) {
      throw new Error("SCAN_TRANSACTION_CREATE_FAILED");
    }

    await saveMappings(userId, entries);

    const shoppingItemIds = Array.from(
      new Set(data.entries.flatMap((entry) => entry.shoppingItemId ? [entry.shoppingItemId] : [])),
    );
    for (const shoppingItemId of shoppingItemIds) {
      const [removeError] = await shoppingService.removeShoppingItem(userId, shoppingItemId);
      if (removeError) {
        throw new Error("SCAN_SHOPPING_ITEM_CLEANUP_FAILED");
      }
    }

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to complete scanned checkout. Please try again.",
    });
  }
}

export const receiptScanningService = {
  getScanUsage,
  extractReceipt,
  completeTransactionScan,
  completeTransactionReplacementScan,
  completeCheckoutScan,
};
