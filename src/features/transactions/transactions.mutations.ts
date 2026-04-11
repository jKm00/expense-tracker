import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteTransactionDTO, NewTransactionDTO } from "./transactions.dtos";
import { assertOnline } from "@/lib/offline-guard";
import { transactionController } from "./transactions.controller";
import { TRANSACTION_QUERY_KEY } from "./transactions.queries";
import { toast } from "sonner";

function saveTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewTransactionDTO) => {
      assertOnline();
      return await transactionController.saveTransaction({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when saving your transaction. Please try again!",
      );
    },
  });
}

function deleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteTransactionDTO) => {
      assertOnline();
      return await transactionController.deleteTransaction({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when trying to delete the transaction. Please try again!",
      );
    },
  });
}

export const transactionMutations = {
  saveTransaction,
  deleteTransaction,
};
