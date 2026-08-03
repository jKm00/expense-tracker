import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import {
  completeReceiptCheckoutScanSchema,
  completeReceiptTransactionReplacementScanSchema,
  completeReceiptTransactionScanSchema,
  createScanUploadSchema,
  getScanSchema,
  listScansSchema,
  matchAwsScanSchema,
} from "./receipt-scanning.dtos";
import { receiptScanningService } from "./receipt-scanning.service";
import { awsScanApi } from "./aws-scan-api";
import type { AwsScan, AwsScanListResult, CreateScanUploadResult } from "./receipt-scanning.models";
import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";

const createScanUpload = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(createScanUploadSchema)
  .handler(async ({ context, data }) => {
    try {
      const result = await awsScanApi.request<CreateScanUploadResult>(context.user.id, "/scans/uploads", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return ok(result);
    } catch (error) {
      return err({ reason: "SCAN_UPLOAD_CREATE_FAILED" as const, message: error instanceof Error ? error.message : "Could not start receipt scan." });
    }
  });

const listScans = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .validator(listScansSchema)
  .handler(async ({ context, data }) => {
    try {
      const params = new URLSearchParams({ limit: String(data.limit) });
      if (data.cursor) params.set("cursor", data.cursor);
      const result = await awsScanApi.request<AwsScanListResult>(context.user.id, `/scans?${params}`);
      return ok(result);
    } catch (error) {
      return err({ reason: "SCAN_LIST_FAILED" as const, message: error instanceof Error ? error.message : "Could not load scans." });
    }
  });

const getScan = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .validator(getScanSchema)
  .handler(async ({ context, data }) => {
    try {
      const result = await awsScanApi.request<AwsScan>(context.user.id, `/scans/${data.scanId}`);
      return ok(result);
    } catch (error) {
      return err({ reason: "SCAN_GET_FAILED" as const, message: error instanceof Error ? error.message : "Could not load scan." });
    }
  });

const getScanFile = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .validator(getScanSchema)
  .handler(async ({ context, data }) => {
    try {
      const result = await awsScanApi.request<{ url: string; expiresAt: number; contentType: string }>(context.user.id, `/scans/${data.scanId}/file`);
      return ok(result);
    } catch (error) {
      return err({ reason: "SCAN_FILE_FAILED" as const, message: error instanceof Error ? error.message : "Could not load original file." });
    }
  });

const deleteScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(getScanSchema)
  .handler(async ({ context, data }) => {
    try {
      await awsScanApi.request<void>(context.user.id, `/scans/${data.scanId}`, { method: "DELETE" });
      return ok(null);
    } catch (error) {
      return err({ reason: "SCAN_DELETE_FAILED" as const, message: error instanceof Error ? error.message : "Could not delete scan." });
    }
  });

const matchScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(matchAwsScanSchema)
  .handler(async ({ context, data }) => {
    try {
      const scan = await awsScanApi.request<AwsScan>(context.user.id, `/scans/${data.scanId}`);
      if (scan.status !== "completed" || !scan.result) {
        return err({ reason: "SCAN_NOT_COMPLETED" as const, message: "This scan has not finished processing yet." });
      }
      return await receiptScanningService.matchExtractedReceipt(context.user.id, {
        receipt: scan.result,
        mode: scan.mode === "shopping-checkout" ? "shopping-checkout" : "transaction",
      });
    } catch (error) {
      return err({ reason: "SCAN_MATCH_FAILED" as const, message: error instanceof Error ? error.message : "Could not prepare scan review." });
    }
  });

const completeTransactionScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(completeReceiptTransactionScanSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.completeTransactionScan(userId, data);
  });

const completeCheckoutScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(completeReceiptCheckoutScanSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.completeCheckoutScan(userId, data);
  });

const completeTransactionReplacementScan = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(completeReceiptTransactionReplacementScanSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await receiptScanningService.completeTransactionReplacementScan(userId, data);
  });

export const receiptScanningController = {
  createScanUpload,
  listScans,
  getScan,
  getScanFile,
  deleteScan,
  matchScan,
  completeTransactionScan,
  completeCheckoutScan,
  completeTransactionReplacementScan,
};
