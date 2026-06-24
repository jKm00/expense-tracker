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

export const scanModeSchema = z.enum(["transaction", "shopping-checkout"]);

const receiptFileDataUrlSchema = z
  .string()
  .max(14_000_000)
  .refine(
    (value) =>
      value.startsWith("data:image/") ||
      value.startsWith("data:application/pdf"),
    "Receipt file must be an image or PDF",
  );

export const extractReceiptSchema = z.object({
  imageDataUrl: receiptFileDataUrlSchema,
  mode: scanModeSchema,
  checkedProductIds: z.array(z.string()).default([]),
});

export type ExtractReceiptDTO = z.infer<typeof extractReceiptSchema>;

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

export const completeReceiptCheckoutScanSchema = z.object({
  store: z.string().trim().max(160).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.date(),
  transactionId: z.string().optional(),
  keepUncheckedItems: z.boolean().default(true),
  entries: z.array(receiptScanSubmitEntrySchema).min(1),
});

export type CompleteReceiptCheckoutScanDTO = z.infer<
  typeof completeReceiptCheckoutScanSchema
>;
