import type { AnalyzeExpenseCommandOutput, ExpenseDocument, ExpenseField } from "@aws-sdk/client-textract";
import type { ExtractedReceipt, ExtractedReceiptItem } from "./model";

function fieldText(field?: ExpenseField) {
  return field?.ValueDetection?.Text?.trim() || undefined;
}

function fieldConfidence(field?: ExpenseField) {
  return (field?.ValueDetection?.Confidence ?? field?.Type?.Confidence ?? 0) / 100;
}

function fieldByType(fields: ExpenseField[] | undefined, type: string) {
  return fields?.find((field) => field.Type?.Text === type);
}

function parseMoney(value?: string) {
  if (!value) return undefined;
  const normalized = value
    .replace(/[^0-9,.-]/g, "")
    .replace(/,(?=\d{2}$)/, ".")
    .replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed.toFixed(2);
}

function parseQuantity(value?: string) {
  if (!value) return "1";
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return "1";
  return Number.isInteger(parsed) ? String(parsed) : "1";
}

type TextractLineField = {
  Type?: { Text?: string; Confidence?: number };
  ValueDetection?: { Text?: string; Confidence?: number };
};

function lineField(fields: TextractLineField[] | undefined, type: string) {
  return fields?.find((field) => field.Type?.Text === type);
}

function parseLineItem(fields: TextractLineField[] | undefined, index: number): ExtractedReceiptItem | null {
  const name = fieldText(lineField(fields, "ITEM") as ExpenseField | undefined);
  const quantity = parseQuantity(fieldText(lineField(fields, "QUANTITY") as ExpenseField | undefined));
  const price = parseMoney(fieldText(lineField(fields, "PRICE") as ExpenseField | undefined));
  const total = parseMoney(fieldText(lineField(fields, "EXPENSE_ROW") as ExpenseField | undefined))
    ?? parseMoney(fieldText(lineField(fields, "TOTAL_PRICE") as ExpenseField | undefined));

  if (!name || (!price && !total)) {
    return null;
  }

  const unitPrice = price ?? total ?? "0.00";
  const lineTotal = total ?? (Number(unitPrice) * Number(quantity)).toFixed(2);
  const confidence = Math.max(
    fieldConfidence(lineField(fields, "ITEM") as ExpenseField | undefined),
    fieldConfidence(lineField(fields, "PRICE") as ExpenseField | undefined),
    fieldConfidence(lineField(fields, "TOTAL_PRICE") as ExpenseField | undefined),
    0.5,
  );

  return {
    name: name.slice(0, 160),
    quantity,
    unitPrice,
    lineTotal,
    confidence: Math.min(1, confidence),
  };
}

function parseDocument(document: ExpenseDocument): ExtractedReceipt {
  const summary = document.SummaryFields ?? [];
  const store = fieldText(fieldByType(summary, "VENDOR_NAME")) ?? fieldText(fieldByType(summary, "NAME"));
  const date = fieldText(fieldByType(summary, "INVOICE_RECEIPT_DATE"));
  const total = parseMoney(fieldText(fieldByType(summary, "TOTAL")));
  const items = (document.LineItemGroups ?? [])
    .flatMap((group) => group.LineItems ?? [])
    .map((lineItem, index) => parseLineItem(lineItem.LineItemExpenseFields as TextractLineField[] | undefined, index))
    .filter((item): item is ExtractedReceiptItem => item !== null);

  return {
    store,
    date,
    total,
    confidence: Math.min(1, Math.max(...summary.map(fieldConfidence), 50) / 100),
    warnings: [],
    items,
  };
}

export function parseAnalyzeExpense(output: AnalyzeExpenseCommandOutput): ExtractedReceipt {
  const documents = output.ExpenseDocuments ?? [];
  const receipts = documents.map(parseDocument);
  const first = receipts[0];
  if (!first) {
    return { confidence: 0, warnings: [], items: [] };
  }

  return {
    ...first,
    items: receipts.flatMap((receipt) => receipt.items),
  };
}
