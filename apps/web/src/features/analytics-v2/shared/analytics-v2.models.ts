import type {
  EntryType,
  TransactionSource,
} from "@/features/transactions/shared/transactions.models";

export type AnalyticsV2PeriodRange = {
  startDate: Date;
  endDate: Date;
};

export type AnalyticsV2Period = AnalyticsV2PeriodRange & {
  isYearly: boolean;
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

export type AnalyticsV2Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type AnalyticsV2ProductTagMap = Map<string, AnalyticsV2Tag[]>;

export type AnalyticsV2Entry = {
  id: string;
  transactionId: string;
  amount: number;
  quantity: number;
  type: EntryType;
  date: Date;
  store: string | null;
  description: string | null;
  source: TransactionSource;
  needsReview: boolean;
  productId: string;
  productName: string;
  tags: AnalyticsV2Tag[];
};

export type AnalyticsV2AvailableTag = AnalyticsV2Tag & {
  amount: number;
};

export type AnalyticsV2Kpis = {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  savingsRate: number;
  recurringIncome: number;
  recurringExpense: number;
  variableIncome: number;
  variableExpense: number;
  averageDailySpend: number;
  projectedExpense: number;
  fixedCoverageRatio: number;
  discretionaryShare: number;
  transactionCount: number;
  activeDays: number;
  needsReviewCount: number;
  largestExpense: number;
  averageTransactionExpense: number;
};

export type AnalyticsV2TrendBucket = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

export type AnalyticsV2TrendPoint = AnalyticsV2TrendBucket & {
  netFlow: number;
  cumulativeIncome: number;
  cumulativeExpense: number;
  cumulativeNetFlow: number;
};

export type AnalyticsV2CategoryAccumulator = AnalyticsV2AvailableTag & {
  count: number;
};

export type AnalyticsV2CategoryBreakdownItem =
  AnalyticsV2CategoryAccumulator & {
    percent: number;
  };

export type AnalyticsV2StoreAccumulator = {
  name: string;
  amount: number;
  count: number;
};

export type AnalyticsV2StoreBreakdownItem = AnalyticsV2StoreAccumulator & {
  average: number;
};

export type AnalyticsV2ProductAccumulator = {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  count: number;
};

export type AnalyticsV2ProductBreakdownItem =
  AnalyticsV2ProductAccumulator & {
    average: number;
  };

export type AnalyticsV2SourceBreakdownItem = {
  source: TransactionSource;
  amount: number;
  count: number;
};

export type AnalyticsV2WeekdayAccumulator = {
  day: string;
  amount: number;
  count: number;
};

export type AnalyticsV2WeekdayBreakdownItem =
  AnalyticsV2WeekdayAccumulator & {
    average: number;
  };

export type AnalyticsV2TransactionDrilldownAccumulator = {
  id: string;
  date: string;
  store: string | null;
  description: string | null;
  source: TransactionSource;
  needsReview: boolean;
  income: number;
  expense: number;
  itemCount: number;
  tags: Map<string, AnalyticsV2Tag>;
};

export type AnalyticsV2Insight = {
  title: string;
  description: string;
  severity: "good" | "warning" | "critical" | "info";
};
