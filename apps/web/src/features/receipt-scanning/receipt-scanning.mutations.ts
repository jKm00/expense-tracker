import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CompleteReceiptCheckoutScanDTO,
  CompleteReceiptTransactionScanDTO,
  ExtractReceiptDTO,
} from "./receipt-scanning.dtos";
import { receiptScanningController } from "./receipt-scanning.controller";
import { TRANSACTION_QUERY_KEY } from "../transactions/transactions.queries";
import { SHOPPING_QUERY_KEY } from "../shopping/shopping.queries";
import { PRODUCT_QUERY_KEY } from "../products/products.queries";

function extractReceipt() {
  return useMutation({
    mutationFn: async (data: ExtractReceiptDTO) => {
      assertOnline();
      return await receiptScanningController.extractReceipt({ data });
    },
    onError: () => {
      toast.error("Something unexpected happened while scanning the receipt. Please try again!");
    },
  });
}

function completeTransactionScan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompleteReceiptTransactionScanDTO) => {
      assertOnline();
      return await receiptScanningController.completeTransactionScan({ data });
    },
    onSuccess: (result) => {
      const [error, transaction] = result;
      if (error) {
        toast.error(error.message ?? "Failed to save scanned transaction. Please try again!");
        return;
      }

      qc.setQueryData([TRANSACTION_QUERY_KEY, transaction.id], result);
      qc.invalidateQueries({ queryKey: [TRANSACTION_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Something unexpected happened when saving the scanned transaction. Please try again!");
    },
  });
}

function completeCheckoutScan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompleteReceiptCheckoutScanDTO) => {
      assertOnline();
      return await receiptScanningController.completeCheckoutScan({ data });
    },
    onSuccess: (result) => {
      const [error, transaction] = result;
      if (error) {
        toast.error(error.message ?? "Failed to complete scanned checkout. Please try again!");
        return;
      }

      qc.setQueryData([TRANSACTION_QUERY_KEY, transaction.id], result);
      qc.invalidateQueries({ queryKey: [TRANSACTION_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [SHOPPING_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Something unexpected happened when completing the scanned checkout. Please try again!");
    },
  });
}

export const receiptScanningMutations = {
  extractReceipt,
  completeTransactionScan,
  completeCheckoutScan,
};
