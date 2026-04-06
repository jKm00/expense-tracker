import { err, ok } from "@/utils/result";
import { transactionRepo } from "./transactions.repo";
import dayjs from "dayjs";
import { NewEntryDTO, NewTransactionDTO } from "./transactions.dtos";
import { NewEntry, NewTransaction, Transaction } from "./transactions.models";
import { productService } from "../products/products.service";
import { Product } from "../products/products.models";

async function getTransactions(userId: string, year?: number, month?: number) {
  try {
    let start: Date;
    if (!year || !month) {
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

async function saveTransaction({
  transaction,
  entries,
}: {
  transaction: Omit<NewTransaction, "totalPrice">;
  entries: NewEntryDTO[];
}) {
  const totalPrice = entries.reduce((acc, curr) => {
    if (curr.type === "expense") {
      return acc - Number(curr.price) * Number(curr.quantity);
    } else {
      return acc + Number(curr.price) * Number(curr.quantity);
    }
  }, 0);

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
  let product: Product;
  if (!entry.product.id) {
    const [productError, savedProduct] = await productService.addProduct({
      userId,
      name: entry.product.name,
    });
    if (productError) {
      return err(productError);
    }
    product = savedProduct;
  } else {
    const [productError, foundProduct] = await productService.getProduct(
      userId,
      entry.product.id,
    );
    if (productError) {
      return err(productError);
    }
    product = foundProduct;
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

export const transactionService = {
  getTransactions,
  saveTransaction,
};
