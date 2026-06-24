import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import {
  completeReceiptCheckoutScanSchema,
  completeReceiptTransactionScanSchema,
  extractReceiptSchema,
} from "./receipt-scanning.dtos";
import { receiptScanningService } from "./receipt-scanning.service";

const extractReceipt = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(extractReceiptSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.extractReceipt(userId, {
      imageDataUrl: data.imageDataUrl,
      mode: data.mode,
    });
  });

const completeTransactionScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(completeReceiptTransactionScanSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.completeTransactionScan(userId, data);
  });

const completeCheckoutScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(completeReceiptCheckoutScanSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.completeCheckoutScan(userId, data);
  });

export const receiptScanningController = {
  extractReceipt,
  completeTransactionScan,
  completeCheckoutScan,
};
