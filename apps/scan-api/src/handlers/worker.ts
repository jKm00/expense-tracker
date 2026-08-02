import type { SQSEvent } from "aws-lambda";
import { AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, textract } from "../aws";
import { config } from "../config";
import { isValidMagicBytes, scanIdFromObjectKey } from "../file-validation";
import { completeScan, failScan, getScanById, claimScanForProcessing } from "../repo";
import { parseAnalyzeExpense } from "../textract-parser";
import { userCausedFailure } from "../validation";

function safeFailureMessage(code: string) {
  switch (code) {
    case "unsupported_file_type":
      return "Choose a JPEG, PNG, or PDF receipt file.";
    case "file_too_large":
      return "Receipt file is too large. Choose a file under 10 MB.";
    case "invalid_file":
      return "The uploaded file could not be read as the selected file type.";
    case "not_a_receipt":
      return "We could not find receipt items in this file.";
    case "unsupported_document":
      return "This document format is not supported for receipt scanning.";
    default:
      return "Receipt processing failed. Please try again.";
  }
}

async function readPrefix(bucket: string, key: string) {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-15" }));
  const bytes = await result.Body?.transformToByteArray();
  return bytes ?? new Uint8Array();
}

async function processObject(bucket: string, key: string) {
  const scanId = scanIdFromObjectKey(key);
  if (!scanId) return;
  const existing = await getScanById(scanId);
  if (!existing) return;
  const scan = await claimScanForProcessing(existing);
  if (!scan) return;

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (head.ContentLength && head.ContentLength > config.maxFileSizeBytes()) {
      await failScan(scan, "file_too_large", safeFailureMessage("file_too_large"), true);
      return;
    }
    if (head.ContentType !== scan.contentType) {
      await failScan(scan, "unsupported_file_type", safeFailureMessage("unsupported_file_type"), true);
      return;
    }
    const prefix = await readPrefix(bucket, key);
    if (!isValidMagicBytes(scan.contentType, prefix)) {
      await failScan(scan, "invalid_file", safeFailureMessage("invalid_file"), true);
      return;
    }

    const textractResult = await textract.send(new AnalyzeExpenseCommand({
      Document: { S3Object: { Bucket: bucket, Name: key } },
    }));
    const receipt = parseAnalyzeExpense(textractResult);
    if (receipt.items.length === 0) {
      await failScan(scan, "not_a_receipt", safeFailureMessage("not_a_receipt"), true);
      return;
    }
    await completeScan(scan, receipt);
  } catch (error) {
    const code = error instanceof Error && error.name.includes("Unsupported") ? "unsupported_document" : "textract_failed";
    await failScan(scan, code, safeFailureMessage(code), userCausedFailure(code));
    if (code === "textract_failed") throw error;
  }
}

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as { Records?: Array<{ s3?: { bucket?: { name?: string }; object?: { key?: string } } }> };
    for (const s3Record of body.Records ?? []) {
      const bucket = s3Record.s3?.bucket?.name;
      const key = s3Record.s3?.object?.key ? decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, " ")) : null;
      if (bucket && key) await processObject(bucket, key);
    }
  }
}
