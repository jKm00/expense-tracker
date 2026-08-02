import { z } from "zod";
import type { ContentType, ScanMode } from "./model";

export const contentTypes: ContentType[] = ["image/jpeg", "image/png", "application/pdf"];
export const scanModes: ScanMode[] = ["transaction", "transaction-replacement", "shopping-checkout"];

export const createUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(contentTypes),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  mode: z.enum(scanModes).default("transaction"),
});

export function extensionForContentType(contentType: ContentType) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
  }
}

export function userCausedFailure(code: string) {
  return [
    "unsupported_file_type",
    "file_too_large",
    "invalid_file",
    "unsupported_document",
    "not_a_receipt",
  ].includes(code);
}
