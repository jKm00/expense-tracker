import { useMemo } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import type {
  AnalyticsMetrics,
  ComparisonDelta,
  ComparisonType,
  DailyChartDataPoint,
  ProductChartDataPoint,
  TagChartDataPoint,
} from "../analytics.types";
import {
  enrichTransactionsWithTags,
  filterByTags,
  computeMetrics,
  computeDelta,
  groupByDay,
  groupByTag,
  getTopProducts,
} from "../analytics.utils";

type UseAnalyticsDataParams = {
  month: number; // 0-indexed
  year: number;
  comparisonType: ComparisonType;
  includeTags: string[];
  excludeTags: string[];
};

type UseAnalyticsDataReturn = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics | null;
  deltas: {
    expenses: ComparisonDelta;
    income: ComparisonDelta;
    net: ComparisonDelta;
    count: ComparisonDelta;
    dailyAvg: ComparisonDelta;
  } | null;
  dailyData: DailyChartDataPoint[];
  comparisonDailyData: DailyChartDataPoint[] | null;
  tagData: TagChartDataPoint[];
  comparisonTagData: TagChartDataPoint[] | null;
  productData: ProductChartDataPoint[];
  isComparing: boolean;
  isComparisonLoading: boolean;
  comparisonError: Error | null;
};

export function useAnalyticsData(
  params: UseAnalyticsDataParams,
): UseAnalyticsDataReturn {
  // IMPORTANT: comparisonType MUST come from `Route.useSearch().compare` via
  // props — never use local state for this value. The URL search params are
  // the single source of truth for comparison mode.
  const { month, year, comparisonType, includeTags, excludeTags } = params;

  // --- 1. Fetch current month transactions (Suspense — prefetched by loader) ---
  const { data: currentTransactionsResult } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(month, year),
  );

  // --- 2. Fetch products with tags (Suspense — prefetched by loader) ---
  const { data: productsResult } = useSuspenseQuery(
    productQueries.getProductsOptions(),
  );

  // --- 3. Compute comparison period ---
  const comparisonPeriod = useMemo(() => {
    if (comparisonType === "nothing") return null;
    const selected = dayjs().year(year).month(month);
    const compDate =
      comparisonType === "month"
        ? selected.subtract(1, "month")
        : selected.subtract(1, "year");
    return { month: compDate.month(), year: compDate.year() };
  }, [comparisonType, month, year]);

  // --- 4. Fetch comparison transactions (non-Suspense — graceful degradation) ---
  // Always pass real query options (even when disabled). When comparisonPeriod
  // is null, we use month=0/year=0 as dummy keys with enabled=false so the
  // queryFn never executes.
  const comparisonMonth = comparisonPeriod?.month ?? 0;
  const comparisonYear = comparisonPeriod?.year ?? 0;

  const {
    data: comparisonTransactionsResult,
    isLoading: isComparisonLoading,
    error: comparisonError,
  } = useQuery({
    ...transactionQueries.getTransactionsOptions(comparisonMonth, comparisonYear),
    enabled: comparisonPeriod !== null,
  });

  // --- 5. Unwrap results ---
  // Result pattern: [err, data] — we use index [1] for data
  const currentTransactions = currentTransactionsResult[1] ?? [];
  const products = productsResult[1] ?? [];
  const comparisonTransactions =
    comparisonPeriod && comparisonTransactionsResult
      ? comparisonTransactionsResult[1] ?? []
      : null;

  // --- 6. Enrich with tags ---
  const enrichedCurrent = useMemo(
    () => enrichTransactionsWithTags(currentTransactions, products),
    [currentTransactions, products],
  );

  const enrichedComparison = useMemo(
    () =>
      comparisonTransactions
        ? enrichTransactionsWithTags(comparisonTransactions, products)
        : null,
    [comparisonTransactions, products],
  );

  // --- 7. Filter by tags ---
  const filteredCurrent = useMemo(
    () => filterByTags(enrichedCurrent, includeTags, excludeTags),
    [enrichedCurrent, includeTags, excludeTags],
  );

  const filteredComparison = useMemo(
    () =>
      enrichedComparison
        ? filterByTags(enrichedComparison, includeTags, excludeTags)
        : null,
    [enrichedComparison, includeTags, excludeTags],
  );

  // --- 8. Compute metrics ---
  const daysInCurrentMonth = dayjs().year(year).month(month).daysInMonth();
  const daysInComparisonMonth = comparisonPeriod
    ? dayjs()
        .year(comparisonPeriod.year)
        .month(comparisonPeriod.month)
        .daysInMonth()
    : 0;

  const metrics = useMemo(
    () => computeMetrics(filteredCurrent, daysInCurrentMonth),
    [filteredCurrent, daysInCurrentMonth],
  );

  const comparisonMetrics = useMemo(
    () =>
      filteredComparison
        ? computeMetrics(filteredComparison, daysInComparisonMonth)
        : null,
    [filteredComparison, daysInComparisonMonth],
  );

  // --- 9. Compute chart data ---
  const dailyData = useMemo(
    () => groupByDay(filteredCurrent, year, month),
    [filteredCurrent, year, month],
  );

  const comparisonDailyData = useMemo(
    () =>
      filteredComparison && comparisonPeriod
        ? groupByDay(
            filteredComparison,
            comparisonPeriod.year,
            comparisonPeriod.month,
          )
        : null,
    [filteredComparison, comparisonPeriod],
  );

  const tagData = useMemo(
    () => groupByTag(filteredCurrent),
    [filteredCurrent],
  );

  const comparisonTagData = useMemo(
    () => (filteredComparison ? groupByTag(filteredComparison) : null),
    [filteredComparison],
  );

  const productData = useMemo(
    () => getTopProducts(filteredCurrent, filteredComparison, 8),
    [filteredCurrent, filteredComparison],
  );

  // --- 10. Compute deltas ---
  const isComparing = comparisonType !== "nothing" && comparisonMetrics !== null;

  const deltas = useMemo(() => {
    if (!comparisonMetrics) return null;

    return {
      expenses: computeDelta(
        metrics.totalExpenses,
        comparisonMetrics.totalExpenses,
        true, // expenses down = favorable
      ),
      income: computeDelta(metrics.totalIncome, comparisonMetrics.totalIncome),
      net: computeDelta(metrics.netBalance, comparisonMetrics.netBalance),
      count: computeDelta(
        metrics.transactionCount,
        comparisonMetrics.transactionCount,
      ),
      dailyAvg: computeDelta(
        metrics.dailyAverage,
        comparisonMetrics.dailyAverage,
        true, // daily average down = favorable
      ),
    };
  }, [metrics, comparisonMetrics]);

  return {
    metrics,
    comparisonMetrics,
    deltas,
    dailyData,
    comparisonDailyData,
    tagData,
    comparisonTagData,
    productData,
    isComparing,
    isComparisonLoading,
    comparisonError: comparisonError as Error | null,
  };
}
