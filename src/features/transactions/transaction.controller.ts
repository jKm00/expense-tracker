import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transaction.service";

// TODO: Add pagination
const getTransactions = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await transactionService.getTransactions(userId);
  });

const NewTransactionSchema = z.object({
  productName: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  type: z.enum(["expense", "income"]),
  source: z.enum(["receipt", "recurring", "manual"]),
});

const addTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(NewTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.addTransaction(userId, data);
  });

export const transactionController = {
  addTransaction,
  getTransactions,
};
