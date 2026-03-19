import { useMutation } from "@tanstack/react-query";
import { CreateTransactionInput } from "./transaction.dtos";
import { transactionController } from "./transaction.controller";

function addTransaction() {
  return useMutation({
    mutationFn: async (data: CreateTransactionInput) =>
      await transactionController.addTransaction({ data }),
  });
}

export const transactionMutations = {
  addTransaction,
};
