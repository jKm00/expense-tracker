import z from "zod";
import {
  positiveIntegerValidator,
  positiveNumberValidator,
} from "@/validators";

export const extractedReceiptItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: positiveIntegerValidator,
  unitPrice: positiveNumberValidator,
  lineTotal: positiveNumberValidator,
  confidence: z.number().min(0).max(1),
});

export const extractedReceiptSchema = z.object({
  store: z.string().trim().max(160).optional(),
  date: z.string().trim().max(80).optional(),
  total: positiveNumberValidator.optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().trim().max(240)).default([]),
  items: z.array(extractedReceiptItemSchema).min(1),
});

export const scanModeSchema = z.enum(["transaction", "transaction-replacement", "shopping-checkout"]);

export const createScanUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  mode: scanModeSchema.default("transaction"),
});

export type CreateScanUploadDTO = z.infer<typeof createScanUploadSchema>;

export const getScanSchema = z.object({ scanId: z.string().min(1) });
export const listScansSchema = z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) });

export const matchAwsScanSchema = z.object({ scanId: z.string().min(1) });

export const receiptScanProductSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(1).max(120),
});

export const receiptScanSubmitEntrySchema = z.object({
  receiptItemName: z.string().trim().min(1).max(160),
  shoppingItemId: z.string().optional(),
  product: receiptScanProductSchema,
  quantity: positiveIntegerValidator,
  price: positiveNumberValidator,
  type: z.literal("expense").default("expense"),
  tagIds: z.array(z.string()).default([]),
});

export type ReceiptScanSubmitEntryDTO = z.input<
  typeof receiptScanSubmitEntrySchema
>;

export const completeReceiptTransactionScanSchema = z.object({
  store: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.date(),
  entries: z.array(receiptScanSubmitEntrySchema).min(1),
});

export type CompleteReceiptTransactionScanDTO = z.infer<
  typeof completeReceiptTransactionScanSchema
>;

export const completeReceiptTransactionReplacementScanSchema = z.object({
  transactionId: z.string(),
  store: z.string().trim().max(160).optional(),
  entries: z.array(receiptScanSubmitEntrySchema).min(1),
});

export type CompleteReceiptTransactionReplacementScanDTO = z.infer<
  typeof completeReceiptTransactionReplacementScanSchema
>;

export const completeReceiptCheckoutScanSchema = z.object({
  store: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.date(),
  keepUncheckedItems: z.boolean().default(true),
  entries: z.array(receiptScanSubmitEntrySchema).min(1),
});

export type CompleteReceiptCheckoutScanDTO = z.infer<
  typeof completeReceiptCheckoutScanSchema
>;
