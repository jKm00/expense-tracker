import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { productService } from "../products/products.service";
import { shoppingService } from "../shopping/shopping.service";
import { transactionService } from "../transactions/transactions.service";
import {
  CompleteReceiptCheckoutScanDTO,
  CompleteReceiptTransactionReplacementScanDTO,
  CompleteReceiptTransactionScanDTO,
  extractedReceiptSchema,
  ReceiptScanSubmitEntryDTO,
} from "./receipt-scanning.dtos";
import { matchReceiptToProducts } from "./receipt-matching";
import { normalizeReceiptName } from "./receipt-normalization";
import { receiptScanningRepo } from "./receipt-scanning.repo";
import { receiptMappingsService } from "./receipt-mappings.service";

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

async function getShoppingListOrThrow(userId: string) {
  const [shoppingError, shoppingList] = await shoppingService.getShoppingList(userId);
  if (shoppingError || !shoppingList) {
    throw new Error("SCAN_SHOPPING_LIST_LOAD_FAILED");
  }

  return shoppingList;
}

async function matchExtractedReceipt(userId: string, input: { receipt: unknown; mode?: "transaction" | "shopping-checkout" }) {
  const receipt = extractedReceiptSchema.parse(input.receipt);
  const [productsError, products] = await productService.getProducts(userId);
  if (productsError) {
    return err({
      reason: "SCAN_PRODUCTS_LOAD_FAILED" as const,
      message: "Could not load products for receipt matching.",
    });
  }

  const normalizedNames = receipt.items.map((item) => normalizeReceiptName(item.name));
  const mappings = await receiptScanningRepo.getMappingsByNames(userId, normalizedNames);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const mappingsWithProducts = mappings.map((mapping) => ({
    ...mapping,
    product: productsById.get(mapping.productId) ?? null,
  }));
  const shoppingList = input.mode === "shopping-checkout" ? await getShoppingListOrThrow(userId) : null;

  return ok({
    ...matchReceiptToProducts({
      receipt,
      products,
      mappings: mappingsWithProducts,
      shoppingItems: shoppingList?.items,
    }),
    parsedDate: parseExtractedDate(receipt.date),
  });
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
    const shoppingItemIds = Array.from(
      new Set(data.entries.flatMap((entry) => entry.shoppingItemId ? [entry.shoppingItemId] : [])),
    );
    const checkoutEntries = entries.map(({ receiptItemName, ...entry }) => entry);
    const [transactionError, transaction] = await shoppingService.completeShopping(userId, {
      store: data.store,
      description: data.description,
      date: data.date,
      transactionId: data.transactionId,
      keepUncheckedItems: data.keepUncheckedItems,
      shoppingItemIds,
      entries: checkoutEntries,
    });

    if (transactionError || !transaction) {
      throw new Error("SCAN_CHECKOUT_COMPLETE_FAILED");
    }

    await saveMappings(userId, entries);

    return ok(transaction);
  } catch (error) {
    return err({
      reason: "SCAN_COMPLETE_FAILED" as const,
      message: "Failed to complete scanned checkout. Please try again.",
    });
  }
}

export const receiptScanningService = {
  matchExtractedReceipt,
  completeTransactionScan,
  completeTransactionReplacementScan,
  completeCheckoutScan,
};
