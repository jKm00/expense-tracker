import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTransactionInput } from "./transaction.dtos";
import { transactionController } from "./transaction.controller";
import { QUERY_KEY } from "./transaction.queries";

function addTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) =>
      await transactionController.addTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}

export const transactionMutations = {
  addTransaction,
};
