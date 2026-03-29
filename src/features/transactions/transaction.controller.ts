import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transaction.service";

const GetTransactionsSchema = z.object({
  month: z.number(),
  year: z.number(),
});

const getTransactions = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(GetTransactionsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.getTransactions(
      userId,
      data.month,
      data.year,
    );
  });

const TransactionIdSchema = z.object({
  id: z.string(),
});

const getTransaction = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(TransactionIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.getTransaction(userId, data.id);
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

const UpdateTransactionSchema = z.object({
  id: z.string(),
  price: z.number(),
  type: z.enum(["expense", "income"]),
  date: z.string(),
  description: z.string().optional(),
});

export type UpdateTransactionDTO = z.infer<typeof UpdateTransactionSchema>;

const updateTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.updateTransaction(userId, data.id, {
      price: data.price.toString(),
      type: data.type,
      date: data.date,
      description: data.description,
    });
  });

const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(TransactionIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.deleteTransaction(userId, data.id);
  });

export const transactionController = {
  addTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};
