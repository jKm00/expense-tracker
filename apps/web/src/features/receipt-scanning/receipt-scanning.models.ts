import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  receiptItemMappings,
  receiptScanAttempts,
} from "./receipt-scanning.schema";

export type ReceiptItemMapping = InferSelectModel<typeof receiptItemMappings>;
export type NewReceiptItemMapping = InferInsertModel<typeof receiptItemMappings>;
export type ReceiptScanAttempt = InferSelectModel<typeof receiptScanAttempts>;
export type NewReceiptScanAttempt = InferInsertModel<typeof receiptScanAttempts>;

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
};
