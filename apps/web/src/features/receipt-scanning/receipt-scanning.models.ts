import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  receiptItemMappings,
} from "./receipt-scanning.schema";

export type ReceiptItemMapping = InferSelectModel<typeof receiptItemMappings>;
export type NewReceiptItemMapping = InferInsertModel<typeof receiptItemMappings>;

export type ExtractedReceiptItem = {
  name: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  confidence: number;
};

export type ExtractedReceipt = {
  store?: string;
  date?: string;
  total?: string;
  confidence: number;
  warnings: string[];
  items: ExtractedReceiptItem[];
};

export type ReceiptScanProduct = {
  id: string;
  name: string;
};

export type ReceiptScanSuggestion = {
  product: ReceiptScanProduct;
  score: number;
  reason: "product" | "alias" | "shopping";
};

export type ReceiptScanLine = {
  id: string;
  receiptItemName: string;
  product: ReceiptScanProduct | null;
  suggestions: ReceiptScanSuggestion[];
  quantity: string;
  price: string;
  lineTotal: string;
  confidence: number;
  shoppingItemId?: string;
};

export type ReceiptScanMatchResult = {
  receipt: ExtractedReceipt;
  lines: ReceiptScanLine[];
  parsedDate?: Date;
};

export type AwsScanStatus = "upload_pending" | "processing" | "completed" | "failed";
export type AwsScanMode = "transaction" | "transaction-replacement" | "shopping-checkout";

export type AwsScanSummary = {
  scanId: string;
  status: AwsScanStatus;
  mode: AwsScanMode;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "application/pdf";
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  resultSummary?: { store?: string; date?: string; total?: string; itemCount: number };
  failureCode?: string;
  failureMessage?: string;
};

export type AwsScanUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
};

export type AwsScanListResult = {
  items: AwsScanSummary[];
  nextCursor?: string;
  usage?: AwsScanUsage;
};

export type AwsScan = AwsScanSummary & {
  objectKey: string;
  userId: string;
  result?: ExtractedReceipt;
};

export type CreateScanUploadResult = {
  scanId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  expiresAt: number;
};
