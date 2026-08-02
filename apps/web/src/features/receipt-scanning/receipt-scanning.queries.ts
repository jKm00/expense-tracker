import { queryOptions } from "@tanstack/react-query";
import { receiptScanningController } from "./receipt-scanning.controller";

export const RECEIPT_SCANNING_QUERY_KEY = "receipt-scanning";

function listScansOptions(cursor?: string) {
  return queryOptions({
    queryKey: [RECEIPT_SCANNING_QUERY_KEY, "list", cursor ?? null],
    queryFn: () => receiptScanningController.listScans({ data: { cursor, limit: 20 } }),
  });
}

function getScanOptions(scanId: string) {
  return queryOptions({
    queryKey: [RECEIPT_SCANNING_QUERY_KEY, "scan", scanId],
    queryFn: () => receiptScanningController.getScan({ data: { scanId } }),
  });
}

function matchScanOptions(scanId: string) {
  return queryOptions({
    queryKey: [RECEIPT_SCANNING_QUERY_KEY, "match", scanId],
    queryFn: () => receiptScanningController.matchScan({ data: { scanId } }),
  });
}

export const receiptScanningQueries = {
  listScansOptions,
  getScanOptions,
  matchScanOptions,
};
