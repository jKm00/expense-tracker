import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transactions.service";
import z from "zod";

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

export const transactionController = {
  getTransactions,
};
