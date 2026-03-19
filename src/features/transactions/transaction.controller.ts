import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transaction.service";

const NewTransactionSchema = z.object({
  product: z.string().min(1),
  price: z.number().min(0),
  type: z.enum(["expense", "income"]),
});

const addTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(NewTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    await transactionService.addTransaction(userId, data);
  });

export const transactionController = {
  addTransaction,
};
