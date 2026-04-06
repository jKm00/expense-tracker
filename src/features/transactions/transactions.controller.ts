import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transactions.service";
import z from "zod";
import { saveTransactionSchema } from "./transactions.dtos";

const getTransactionsSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
});

const getTransactions = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getTransactionsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { year, month } = data;
    return await transactionService.getTransactions(userId, year, month);
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
        source: data.source,
      },
      entries: data.entries,
    });
  });

export const transactionController = {
  getTransactions,
  saveTransaction,
};
