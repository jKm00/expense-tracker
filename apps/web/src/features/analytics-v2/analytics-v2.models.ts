import type {
  EntryType,
  TransactionSource,
} from "../transactions/transactions.models";

export type AnalyticsV2PeriodRange = {
  startDate: Date;
  endDate: Date;
};

export type AnalyticsV2EntryRow = {
  id: string;
  transactionId: string;
  price: string;
  quantity: number;
  type: EntryType;
  date: Date;
  store: string | null;
  description: string | null;
  source: TransactionSource;
  needsReview: boolean;
  productId: string;
  productName: string;
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
};
