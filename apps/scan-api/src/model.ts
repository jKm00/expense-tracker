export type ScanStatus = "upload_pending" | "processing" | "completed" | "failed";
export type ScanMode = "transaction" | "transaction-replacement" | "shopping-checkout";
export type ContentType = "image/jpeg" | "image/png" | "application/pdf";

export type FailureCode =
  | "unsupported_file_type"
  | "file_too_large"
  | "invalid_file"
  | "unsupported_document"
  | "not_a_receipt"
  | "textract_failed"
  | "unexpected_error";

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
  currency?: string;
  confidence: number;
  warnings: string[];
  items: ExtractedReceiptItem[];
};

export type ScanRecord = {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  scanId: string;
  userId: string;
  status: ScanStatus;
  mode: ScanMode;
  objectKey: string;
  fileName: string;
  contentType: ContentType;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: number;
  result?: ExtractedReceipt;
  resultSummary?: {
    store?: string;
    date?: string;
    total?: string;
    itemCount: number;
  };
  failureCode?: FailureCode;
  failureMessage?: string;
  countsAgainstLimit?: boolean;
};

export type DailyUsageRecord = {
  pk: string;
  sk: string;
  userId: string;
  day: string;
  used: number;
  updatedAt: string;
  expiresAt: number;
};

export function userPk(userId: string) {
  return `USER#${userId}`;
}

export function scanSk(scanId: string) {
  return `SCAN#${scanId}`;
}

export function dailyUsageSk(day: string) {
  return `USAGE#${day}`;
}

export function createdSk(createdAt: string, scanId: string) {
  return `CREATED#${createdAt}#${scanId}`;
}

export function scanGsiPk(scanId: string) {
  return `SCAN#${scanId}`;
}

export function toSummary(record: ScanRecord) {
  return {
    scanId: record.scanId,
    status: record.status,
    mode: record.mode,
    fileName: record.fileName,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resultSummary: record.resultSummary,
    failureCode: record.failureCode,
    failureMessage: record.failureMessage,
  };
}
