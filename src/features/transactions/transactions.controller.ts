import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transactions.service";
import {
  getTransactionSchema,
  getTransactionsSchema,
  saveTransactionSchema,
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

export const transactionController = {
  getTransactions,
  getTransaction,
  saveTransaction,
};
