import { err, ok } from "@/utils/result";
import { transactionRepo } from "./transactions.repo";
import dayjs from "dayjs";
import { NewEntryDTO, UpdateEntryDTO } from "./transactions.dtos";
import { NewTransaction, Transaction } from "./transactions.models";
import { productService } from "../products/products.service";

async function getTransactions(userId: string, year?: number, month?: number) {
  try {
    let start: Date;
    if (year === undefined || month === undefined) {
      start = dayjs().startOf("month").toDate();
    } else {
      start = new Date(year, month, 1);
    }

    const end = dayjs(start).add(1, "month").toDate();
    const transactions = await transactionRepo.getAll(userId, start, end);
    return ok(transactions);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      message: `Failed to fetch transactions for user ${userId}`,
    });
  }
}

async function getTransaction(userId: string, transactionId: string) {
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
  await Promise.all(
    entries.map(
      async (entry) =>
        await saveEntry(transaction.userId, savedTransaction.id, entry),
    ),
  );

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

  const savedEntries = await transactionRepo.saveEntry({
    ...entry,
    transactionId,
    productId: product.id,
    quantity: Number(entry.quantity),
  });

  if (savedEntries.length === 0) {
    return err({
      reason: "SAVE_ENTRY_NO_RETURNING",
      message: "Nothing was returned after saving transaction",
    });
  }

  return ok(savedEntries[0]);
}

async function deleteTransaction(userId: string, transactionId: string) {
  const [foundError] = await getTransaction(userId, transactionId);
  if (foundError) {
    return err(foundError);
  }

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
  // Verify ownership
  const [foundError, existingTransaction] = await getTransaction(
    userId,
    transactionId,
  );
  if (foundError) {
    return err(foundError);
  }

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

  // Update transaction
  try {
    const updated = await transactionRepo.update(transactionId, {
      ...transaction,
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

  // Delete removed entries
  await Promise.all(
    entriesToDelete.map(async (entryId) => {
      try {
        await transactionRepo.removeEntry(entryId);
      } catch (error) {
        // Continue even if delete fails
      }
    }),
  );

  // Update or create entries
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.id) {
        await updateEntry(userId, entry.id, entry);
      } else {
        await saveEntry(userId, transactionId, entry);
      }
    }),
  );

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

  const updatedEntries = await transactionRepo.updateEntry(entryId, {
    ...entry,
    productId: product.id,
    quantity: Number(entry.quantity),
  });

  if (updatedEntries.length === 0) {
    return err({
      reason: "UPDATE_ENTRY_NO_RETURNING",
      message: "Nothing was returned after updating entry",
    });
  }

  return ok(updatedEntries[0]);
}

// --- Shared helpers ---

function calculateTotalPrice(entries: NewEntryDTO[]): number {
  return entries.reduce((acc, curr) => {
    if (curr.type === "expense") {
      return acc - Number(curr.price) * Number(curr.quantity);
    } else {
      return acc + Number(curr.price) * Number(curr.quantity);
    }
  }, 0);
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
  getTransaction,
  saveTransaction,
  deleteTransaction,
  updateTransaction,
};
