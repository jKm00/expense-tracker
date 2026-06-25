import { queryOptions } from "@tanstack/react-query";
import { receiptScanningController } from "./receipt-scanning.controller";

export const RECEIPT_SCANNING_QUERY_KEY = "receipt-scanning";

function getScanUsageOptions() {
  return queryOptions({
    queryKey: [RECEIPT_SCANNING_QUERY_KEY, "usage"],
    queryFn: receiptScanningController.getScanUsage,
  });
}

export const receiptScanningQueries = {
  getScanUsageOptions,
};
