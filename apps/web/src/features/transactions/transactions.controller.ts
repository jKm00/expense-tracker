import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transactions.service";
import {
  deleteTransactionSchema,
  getTransactionSchema,
  getTransactionsSchema,
  linkTagToEntrySchema,
  saveTransactionSchema,
  updateTransactionSchema,
} from "./transactions.dtos";

const getTransactions = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getTransactionsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { year, month } = data;
    return await transactionService.getTransactions(userId, year, month);
  });

const getTransaction = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const transactionId = data.transactionId;
    return await transactionService.getTransaction(userId, transactionId);
  });

const getTransactionKpis = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getTransactionsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.getTransactionKpis(userId, data);
  });

const saveTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(saveTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.saveTransaction({
      transaction: {
        userId,
        store: data.store,
        description: data.description,
        date: data.date,
        source: data.source,
      },
      entries: data.entries,
    });
  });

const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(deleteTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { transactionId } = data;
    return await transactionService.deleteTransaction(userId, transactionId);
  });

const updateTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { transactionId, ...updateData } = data;
    return await transactionService.updateTransaction(userId, transactionId, {
      transaction: {
        store: updateData.store,
        description: updateData.description,
        date: updateData.date,
      },
      entries: updateData.entries,
    });
  });

const linkTagToEntry = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(linkTagToEntrySchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { transactionId, entryId, tagId } = data;
    return await transactionService.linkTagToEntry(
      userId,
      transactionId,
      entryId,
      tagId,
    );
  });

const unlinkTagFromEntry = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(linkTagToEntrySchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { transactionId, entryId, tagId } = data;
    return await transactionService.unlinkTagFromEntry(
      userId,
      transactionId,
      entryId,
      tagId,
    );
  });

export const transactionController = {
  getTransactions,
  getTransactionKpis,
  getTransaction,
  saveTransaction,
  deleteTransaction,
  updateTransaction,
  linkTagToEntry,
  unlinkTagFromEntry,
};
