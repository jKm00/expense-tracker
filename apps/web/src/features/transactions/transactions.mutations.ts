import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DeleteTransactionDTO,
  LinkTagToEntryDTO,
  NewTransactionDTO,
  UpdateTransactionDTO,
} from "./transactions.dtos";
import { assertOnline } from "@/lib/offline-guard";
import { transactionController } from "./transactions.controller";
import { TRANSACTION_QUERY_KEY } from "./transactions.queries";
import { toast } from "sonner";
import { PRODUCT_QUERY_KEY } from "../products/products.queries";

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
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
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

function updateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTransactionDTO) => {
      assertOnline();
      return await transactionController.updateTransaction({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY],
      });
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when updating your transaction. Please try again!",
      );
    },
  });
}

function linkTagToEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkTagToEntryDTO) => {
      assertOnline();
      return await transactionController.linkTagToEntry({ data });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY, variables.transactionId],
      });
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when linking tag to entry. Please try again!",
      );
    },
  });
}

function unlinkTagFromEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkTagToEntryDTO) => {
      assertOnline();
      return await transactionController.unlinkTagFromEntry({ data });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY, variables.transactionId],
      });
      qc.invalidateQueries({
        queryKey: [TRANSACTION_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when unlinking tag from entry. Please try again!",
      );
    },
  });
}

export const transactionMutations = {
  saveTransaction,
  deleteTransaction,
  updateTransaction,
  linkTagToEntry,
  unlinkTagFromEntry,
};
