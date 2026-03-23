import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateTransactionInput } from "./transaction.dtos";
import {
  transactionController,
  UpdateTransactionDTO,
} from "./transaction.controller";
import { QUERY_KEY } from "./transaction.queries";
import { assertOnline } from "@/lib/offline-guard";

function addTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      assertOnline();
      return await transactionController.addTransaction({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function updateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTransactionDTO) => {
      assertOnline();
      return await transactionController.updateTransaction({ data });
    },
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
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function deleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string }) => {
      assertOnline();
      return await transactionController.deleteTransaction({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export const transactionMutations = {
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
