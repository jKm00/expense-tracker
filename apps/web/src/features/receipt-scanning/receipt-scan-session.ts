import { ReceiptScanMatchResult } from "./receipt-scanning.models";

const pendingTransactionScans = new Map<string, ReceiptScanMatchResult>();

export function setPendingTransactionScan(transactionId: string, result: ReceiptScanMatchResult) {
  pendingTransactionScans.set(transactionId, result);
}

export function takePendingTransactionScan(transactionId: string) {
  const result = pendingTransactionScans.get(transactionId) ?? null;
  pendingTransactionScans.delete(transactionId);
  return result;
}
