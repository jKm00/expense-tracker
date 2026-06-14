import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { getLogger } from "../logger/logger.context";
import { transactionRepo } from "./transactions.repo";
import dayjs from "dayjs";
import { GetTransactionsDTO, NewEntryDTO, UpdateEntryDTO } from "./transactions.dtos";
import { NewTransaction, Transaction, TransactionKpis } from "./transactions.models";
import { productService } from "../products/products.service";
import { tagsService } from "../tags/tags.service";

async function getTransactions(userId: string, year?: number, month?: number) {
  const logger = getLogger();
  logger.addAttrs({ transactionAction: "getTransactions", year, month });

  try {
    let start: Date;
    if (year === undefined || month === undefined) {
      start = dayjs().startOf("month").toDate();
    } else {
      start = new Date(year, month, 1);
    }

    const end = dayjs(start).add(1, "month").toDate();
    const transactions = await transactionRepo.getAll(userId, start, end);
    logger.addAttrs({ transactionCount: transactions.length });
    return ok(transactions);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      message: `Failed to fetch transactions for user ${userId}`,
    });
  }
}

async function getTransactionKpis(
  userId: string,
  input: GetTransactionsDTO,
) {
  const logger = getLogger();
  logger.addAttrs({
    transactionAction: "getTransactionKpis",
    year: input.year,
    month: input.month,
  });

  try {
    let start: Date;
    if (input.year === undefined || input.month === undefined) {
      start = dayjs().startOf("month").toDate();
    } else {
      start = new Date(input.year, input.month, 1);
    }

    const end = dayjs(start).add(1, "month").toDate();
    const { transactionCount, totalEntries } = await transactionRepo.getKpis(
      userId,
      start,
      end,
    );
    const daysInMonth = dayjs(start).daysInMonth();
    logger.addAttrs({ transactionCount, transactionEntryCount: totalEntries });

    return ok<TransactionKpis>({
      count: transactionCount,
      averagePerDay: Math.round((transactionCount / daysInMonth) * 100) / 100,
      averageItemsPerTransaction:
        transactionCount === 0
          ? 0
          : Math.round((totalEntries / transactionCount) * 100) / 100,
    });
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      message: `Failed to fetch transaction kpis for user ${userId}`,
    });
  }
}

async function getTransaction(userId: string, transactionId: string) {
  getLogger().addAttrs({ transactionAction: "getTransaction", transactionId });

  try {
    const transaction = await transactionRepo.getOne(transactionId);
    if (!transaction) {
      return err({
        reason: "TRANSACTION_NOT_FOUND",
        message: `Transaction with id ${transactionId} not found`,
      });
    }

    if (transaction.userId !== userId) {
      return err({
        reason: "TRANSACTION_UNAUTHORIZED",
        message: `User with id ${userId} does not have access to transaction with id ${transactionId}`,
      });
    }

    return ok({
      ...transaction,
      entries: transaction.entries.map((entry) => ({
        ...entry,
        product: entry.products,
      })),
    });
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message: `Failed to fetch transaction (${transactionId}) for user ${userId}`,
    });
  }
}

async function saveTransaction({
  transaction,
  entries,
}: {
  transaction: Omit<NewTransaction, "totalPrice">;
  entries: NewEntryDTO[];
}) {
  const logger = getLogger();
  logger.addAttrs({
    transactionAction: "saveTransaction",
    transactionSource: transaction.source,
    transactionEntryCount: entries.length,
    transactionStorePresent: Boolean(transaction.store),
  });

  const totalPrice = calculateTotalPrice(entries);

  let savedTransactions: Transaction[];
  try {
    savedTransactions = await transactionRepo.save({
      ...transaction,
      totalPrice: String(totalPrice),
    });
  } catch (error) {
    return err({
      reason: "SAVE_TRANSACTION_ERROR",
      message: "Failed to save transaction to DB",
    });
  }

  if (savedTransactions.length === 0) {
    return err({
      reason: "SAVE_TRANSACTION_NO_RETURNING",
      message: "Nothing was returned after saving transaction",
    });
  }

  const savedTransaction = savedTransactions[0];
  logger.addAttrs({
    transactionId: savedTransaction.id,
    transactionTotalPrice: totalPrice,
  });
  for (const entry of entries) {
    const [saveEntryError] = await saveEntry(
      transaction.userId,
      savedTransaction.id,
      entry,
    );
    if (saveEntryError) {
      return err(saveEntryError);
    }
  }

  return ok(savedTransaction);
}

async function saveEntry(
  userId: string,
  transactionId: string,
  entry: NewEntryDTO,
) {
  const [productError, product] = await resolveProduct(userId, entry.product);
  if (productError) {
    return err(productError);
  }

  const tagIds = normalizeTagIds(entry.tagIds);
  const [tagValidationError] = await assertTagOwnership(userId, tagIds);
  if (tagValidationError) {
    return err(tagValidationError);
  }

  const savedEntries = await transactionRepo.saveEntry({
    transactionId,
    productId: product.id,
    price: entry.price,
    quantity: Number(entry.quantity),
    type: entry.type,
  });

  if (savedEntries.length === 0) {
    return err({
      reason: "SAVE_ENTRY_NO_RETURNING",
      message: "Nothing was returned after saving transaction",
    });
  }

  const savedEntry = savedEntries[0];
  const [syncError] = await replaceEntryTags(savedEntry.id, tagIds);
  if (syncError) {
    return err(syncError);
  }

  return ok(savedEntry);
}

async function deleteTransaction(userId: string, transactionId: string) {
  getLogger().addAttrs({ transactionAction: "deleteTransaction", transactionId });

  const [foundError] = await getTransaction(userId, transactionId);
  if (foundError) {
    return err(foundError);
  }
  getLogger().addAttrs({ transactionAction: "deleteTransaction", transactionId });

  try {
    const removed = await transactionRepo.remove(transactionId);
    if (removed.length === 0) {
      return err({
        reason: "TRANSACTION_NOT_RETURNED",
        message: `No transaction returned after deleting`,
      });
    }
    return ok(removed);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      message: `Failed to remove transaction ${transactionId} from DB`,
    });
  }
}

async function updateTransaction(
  userId: string,
  transactionId: string,
  {
    transaction,
    entries,
  }: {
    transaction: Partial<Omit<NewTransaction, "totalPrice">>;
    entries: UpdateEntryDTO[];
  },
) {
  const logger = getLogger();
  logger.addAttrs({
    transactionAction: "updateTransaction",
    transactionId,
    transactionEntryCount: entries.length,
    transactionUpdateFields: Object.keys(transaction),
  });

  // Verify ownership
  const [foundError, existingTransaction] = await getTransaction(
    userId,
    transactionId,
  );
  if (foundError) {
    return err(foundError);
  }
  logger.addAttrs({ transactionAction: "updateTransaction", transactionId });

  // Validate that all provided entry IDs belong to this transaction
  const existingEntryIds = new Set(
    existingTransaction.entries.map((e) => e.id),
  );
  const invalidEntryIds = entries
    .filter((e) => e.id)
    .filter((e) => !existingEntryIds.has(e.id!));

  if (invalidEntryIds.length > 0) {
    return err({
      reason: "INVALID_ENTRY_IDS",
      message: `Entry IDs do not belong to this transaction: ${invalidEntryIds.map((e) => e.id).join(", ")}`,
    });
  }

  const totalPrice = calculateTotalPrice(entries);
  const entryChanges = hasEntryChanges(existingTransaction.entries, entries);
  const nextNeedsReview =
    existingTransaction.needsReview && entryChanges
      ? false
      : existingTransaction.needsReview;

  // Update transaction
  try {
    const updated = await transactionRepo.update(transactionId, {
      ...transaction,
      needsReview: nextNeedsReview,
      totalPrice: String(totalPrice),
    });

    if (updated.length === 0) {
      return err({
        reason: "UPDATE_TRANSACTION_NO_RETURNING",
        message: "Nothing was returned after updating transaction",
      });
    }
  } catch (error) {
    return err({
      reason: "UPDATE_TRANSACTION_ERROR",
      message: "Failed to update transaction in DB",
    });
  }

  // Determine which entries to delete
  const updatedEntryIds = new Set(
    entries.filter((e) => e.id).map((e) => e.id),
  );
  const entriesToDelete = [...existingEntryIds].filter(
    (id) => !updatedEntryIds.has(id),
  );
  logger.addAttrs({
    transactionEntriesToDeleteCount: entriesToDelete.length,
    transactionHasEntryChanges: entryChanges,
  });

  // Delete removed entries
  for (const entryId of entriesToDelete) {
    try {
      await transactionRepo.removeEntry(entryId);
    } catch (error) {
      return err({
        reason: "REMOVE_ENTRY_ERROR",
        message: `Failed to remove entry ${entryId} from transaction ${transactionId}`,
      });
    }
  }

  // Update or create entries
  for (const entry of entries) {
    const [saveOrUpdateError] = entry.id
      ? await updateEntry(userId, entry.id, entry)
      : await saveEntry(userId, transactionId, entry);

    if (saveOrUpdateError) {
      return err(saveOrUpdateError);
    }
  }

  // Re-fetch to return the fully updated transaction
  const [refetchError, updatedTransaction] = await getTransaction(
    userId,
    transactionId,
  );
  if (refetchError) {
    return err(refetchError);
  }

  return ok(updatedTransaction);
}

async function updateEntry(
  userId: string,
  entryId: string,
  entry: NewEntryDTO,
) {
  const [productError, product] = await resolveProduct(userId, entry.product);
  if (productError) {
    return err(productError);
  }

  const tagIds = normalizeTagIds(entry.tagIds);
  const [tagValidationError] = await assertTagOwnership(userId, tagIds);
  if (tagValidationError) {
    return err(tagValidationError);
  }

  const updatedEntries = await transactionRepo.updateEntry(entryId, {
    productId: product.id,
    price: entry.price,
    quantity: Number(entry.quantity),
    type: entry.type,
  });

  if (updatedEntries.length === 0) {
    return err({
      reason: "UPDATE_ENTRY_NO_RETURNING",
      message: "Nothing was returned after updating entry",
    });
  }

  const [syncError] = await replaceEntryTags(entryId, tagIds);
  if (syncError) {
    return err(syncError);
  }

  return ok(updatedEntries[0]);
}

async function linkTagToEntry(
  userId: string,
  transactionId: string,
  entryId: string,
  tagId: string,
) {
  getLogger().addAttrs({
    transactionAction: "linkTagToEntry",
    transactionId,
    entryId,
    tagId,
  });

  const [transactionError, transaction] = await getTransaction(
    userId,
    transactionId,
  );
  if (transactionError) {
    return err(transactionError);
  }
  getLogger().addAttrs({
    transactionAction: "linkTagToEntry",
    transactionId,
    entryId,
    tagId,
  });

  const entry = transaction.entries.find((txEntry) => txEntry.id === entryId);
  if (!entry) {
    return err({
      reason: "INVALID_ENTRY_IDS",
      message: `Entry ${entryId} does not belong to transaction ${transactionId}`,
    });
  }

  const [tagError] = await tagsService.getTag(userId, tagId);
  if (tagError) {
    return err(tagError);
  }

  const hasTag = entry.tags.some((tag) => tag.id === tagId);
  if (hasTag) {
    return ok({
      success: true as const,
      message: `Tag ${tagId} already linked to entry ${entryId}`,
    });
  }

  try {
    await transactionRepo.saveEntryTagLink(entryId, tagId);
  } catch (error) {
    return err({
      reason: "LINK_ENTRY_TAG_ERROR",
      message: `Failed to link tag ${tagId} to entry ${entryId}`,
    });
  }

  return ok({
    success: true as const,
    message: `Tag ${tagId} linked to entry ${entryId}`,
  });
}

async function unlinkTagFromEntry(
  userId: string,
  transactionId: string,
  entryId: string,
  tagId: string,
) {
  getLogger().addAttrs({
    transactionAction: "unlinkTagFromEntry",
    transactionId,
    entryId,
    tagId,
  });

  const [transactionError, transaction] = await getTransaction(
    userId,
    transactionId,
  );
  if (transactionError) {
    return err(transactionError);
  }
  getLogger().addAttrs({
    transactionAction: "unlinkTagFromEntry",
    transactionId,
    entryId,
    tagId,
  });

  const entry = transaction.entries.find((txEntry) => txEntry.id === entryId);
  if (!entry) {
    return err({
      reason: "INVALID_ENTRY_IDS",
      message: `Entry ${entryId} does not belong to transaction ${transactionId}`,
    });
  }

  try {
    const removed = await transactionRepo.removeEntryTagLink(entryId, tagId);
    if (removed.length === 0) {
      return err({
        reason: "TAG_ENTRY_LINK_NOT_FOUND",
        message: `Link between tag ${tagId} and entry ${entryId} not found`,
      });
    }
  } catch (error) {
    return err({
      reason: "UNLINK_ENTRY_TAG_ERROR",
      message: `Failed to unlink tag ${tagId} from entry ${entryId}`,
    });
  }

  return ok({
    success: true as const,
    message: `Tag ${tagId} unlinked from entry ${entryId}`,
  });
}

// --- Shared helpers ---

async function assertTagOwnership(userId: string, tagIds: string[]) {
  for (const tagId of tagIds) {
    const [tagError] = await tagsService.getTag(userId, tagId);
    if (tagError) {
      return err(tagError);
    }
  }

  return ok(true);
}

async function replaceEntryTags(entryId: string, tagIds: string[]) {
  try {
    await transactionRepo.removeAllEntryTagLinks(entryId);

    for (const tagId of tagIds) {
      await transactionRepo.saveEntryTagLink(entryId, tagId);
    }
  } catch (error) {
    return err({
      reason: "SAVE_ENTRY_TAG_ERROR",
      message: `Failed to save tags for entry ${entryId}`,
    });
  }

  return ok(true);
}

function normalizeTagIds(tagIds?: string[]) {
  return Array.from(new Set(tagIds ?? []));
}

function calculateTotalPrice(entries: NewEntryDTO[]): number {
  return entries.reduce((acc, curr) => {
    if (curr.type === "expense") {
      return acc - Number(curr.price) * Number(curr.quantity);
    } else {
      return acc + Number(curr.price) * Number(curr.quantity);
    }
  }, 0);
}

function hasEntryChanges(
  existingEntries: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: string;
    type: "income" | "expense";
    tags: Array<{ id: string }>;
  }>,
  incomingEntries: UpdateEntryDTO[],
) {
  if (existingEntries.length !== incomingEntries.length) {
    return true;
  }

  const existingById = new Map(existingEntries.map((entry) => [entry.id, entry]));
  for (const incoming of incomingEntries) {
    if (!incoming.id) {
      return true;
    }

    const existing = existingById.get(incoming.id);
    if (!existing) {
      return true;
    }

    const incomingProductId = incoming.product.id;
    if (!incomingProductId || incomingProductId !== existing.productId) {
      return true;
    }

    if (Number(incoming.quantity) !== existing.quantity) {
      return true;
    }

    if (Number(incoming.price) !== Number(existing.price)) {
      return true;
    }

    if (incoming.type !== existing.type) {
      return true;
    }

    const existingTagIds = normalizeTagIds(existing.tags.map((tag) => tag.id)).sort();
    const incomingTagIds = normalizeTagIds(incoming.tagIds).sort();
    if (existingTagIds.length !== incomingTagIds.length) {
      return true;
    }

    for (let i = 0; i < existingTagIds.length; i++) {
      if (existingTagIds[i] !== incomingTagIds[i]) {
        return true;
      }
    }
  }

  return false;
}

async function resolveProduct(
  userId: string,
  product: { id: string | null; name: string },
) {
  if (!product.id) {
    return await productService.addProduct({
      userId,
      name: product.name,
    });
  }
  return await productService.getProduct(userId, product.id);
}

export const transactionService = {
  getTransactions,
  getTransactionKpis,
  getTransaction,
  saveTransaction,
  deleteTransaction,
  updateTransaction,
  linkTagToEntry,
  unlinkTagFromEntry,
};
