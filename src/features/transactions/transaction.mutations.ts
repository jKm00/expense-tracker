import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTransactionInput } from "./transaction.dtos";
import {
  transactionController,
  UpdateTransactionDTO,
} from "./transaction.controller";
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

function updateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTransactionDTO) =>
      transactionController.updateTransaction({ data }),
    onSuccess: (data) => {
      const [error, transaction] = data;
      // Invalidate both list and detail queries
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
      if (!error && transaction) {
        // Invalidate the specific transaction detail query
        qc.invalidateQueries({
          queryKey: [QUERY_KEY, transaction.id],
        });
      }
    },
  });
}

function deleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) =>
      transactionController.deleteTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}

export const transactionMutations = {
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
