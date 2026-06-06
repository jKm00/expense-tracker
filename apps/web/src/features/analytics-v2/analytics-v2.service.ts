import { err, ok } from "@/utils/result";
import { productService } from "../products/products.service";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isSameMonth,
  isSameYear,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { analyticsV2Repo } from "./analytics-v2.repo";
import type {
  AnalyticsV2AvailableTag,
  AnalyticsV2CategoryAccumulator,
  AnalyticsV2CategoryBreakdownItem,
  AnalyticsV2Entry,
  AnalyticsV2EntryRow,
  AnalyticsV2Insight,
  AnalyticsV2Kpis,
  AnalyticsV2Period,
  AnalyticsV2ProductAccumulator,
  AnalyticsV2ProductBreakdownItem,
  AnalyticsV2ProductTagMap,
  AnalyticsV2SourceBreakdownItem,
  AnalyticsV2StoreAccumulator,
  AnalyticsV2StoreBreakdownItem,
  AnalyticsV2Tag,
  AnalyticsV2TransactionDrilldownAccumulator,
  AnalyticsV2TrendBucket,
  AnalyticsV2TrendPoint,
  AnalyticsV2WeekdayAccumulator,
  AnalyticsV2WeekdayBreakdownItem,
} from "./analytics-v2.models";

const fallbackTag = {
  id: "untagged",
  name: "Untagged",
  color: "#94a3b8",
};

async function getDashboardData(
  userId: string,
  year?: number,
  month?: number,
  tagIds?: string[],
) {
  try {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const period = getPeriod(targetYear, month);
    const comparisonPeriod = getComparisonPeriod(period, month);

    const [periodRows, comparisonRows] = await Promise.all([
      analyticsV2Repo.getEntryRows(userId, period),
      analyticsV2Repo.getEntryRows(userId, comparisonPeriod),
    ]);

    const productTagMap = await getProductTagMap(userId, [
      ...new Set(periodRows.map((entry) => entry.productId)),
    ]);
    const comparisonProductTagMap = await getProductTagMap(userId, [
      ...new Set(comparisonRows.map((entry) => entry.productId)),
    ]);

    const periodEntries = hydrateEntries(periodRows, productTagMap);
    const comparisonEntries = hydrateEntries(
      comparisonRows,
      comparisonProductTagMap,
    );
    const availableTags = buildAvailableTags(periodEntries);
    const filteredEntries =
      tagIds && tagIds.length > 0
        ? periodEntries.filter((entry) =>
            entry.tags.some((tag) => tagIds.includes(tag.id)),
          )
        : periodEntries;

    return ok({
      period: {
        start: format(period.startDate, "yyyy-MM-dd"),
        end: format(period.endDate, "yyyy-MM-dd"),
        label: period.isYearly
          ? format(period.startDate, "yyyy")
          : format(period.startDate, "MMMM yyyy"),
        isYearly: period.isYearly,
      },
      availableTags,
      selectedTagIds: tagIds ?? [],
      ...buildDashboardPayload(
        filteredEntries,
        comparisonEntries,
        period,
        comparisonPeriod,
        now,
      ),
    });
  } catch (error) {
    return err({
      reason: "ANALYTICS_V2_ERROR",
      message: "Failed to fetch analytics v2 dashboard data",
    });
  }
}

function getPeriod(year: number, month?: number): AnalyticsV2Period {
  if (month === undefined) {
    const date = new Date(year, 0, 1);
    return {
      startDate: startOfYear(date),
      endDate: endOfYear(date),
      isYearly: true,
    };
  }

  const date = new Date(year, month, 1);
  return {
    startDate: startOfMonth(date),
    endDate: endOfMonth(date),
    isYearly: false,
  };
}

function getComparisonPeriod(
  period: AnalyticsV2Period,
  month?: number,
): AnalyticsV2Period {
  if (period.isYearly) {
    return {
      startDate: startOfYear(subYears(period.startDate, 1)),
      endDate: endOfYear(subYears(period.startDate, 1)),
      isYearly: true,
    };
  }

  const comparisonDate = subMonths(period.startDate, 1);
  return {
    startDate: startOfMonth(comparisonDate),
    endDate: endOfMonth(comparisonDate),
    isYearly: month === undefined,
  };
}

async function getProductTagMap(userId: string, productIds: string[]) {
  const map: AnalyticsV2ProductTagMap = new Map();
  if (productIds.length === 0) return map;

  const [error, rows] = await productService.getProductTagRows(
    userId,
    productIds,
  );
  if (error) {
    throw new Error(error.message);
  }

  for (const row of rows) {
    const productTagsForProduct = map.get(row.productId) ?? [];
    productTagsForProduct.push({
      id: row.tagId,
      name: row.tagName,
      color: row.tagColor,
    });
    map.set(row.productId, productTagsForProduct);
  }

  return map;
}

function hydrateEntries(
  rows: AnalyticsV2EntryRow[],
  productTagMap: AnalyticsV2ProductTagMap,
) {
  const entriesById = new Map<string, AnalyticsV2Entry>();

  for (const row of rows) {
    const existing = entriesById.get(row.id);
    const entry = existing ?? {
      id: row.id,
      transactionId: row.transactionId,
      amount: Math.abs(Number(row.price)) * row.quantity,
      quantity: row.quantity,
      type: row.type,
      date: row.date,
      store: row.store,
      description: row.description,
      source: row.source,
      needsReview: row.needsReview,
      productId: row.productId,
      productName: row.productName,
      tags: [],
    };

    if (row.tagId && !entry.tags.some((tag) => tag.id === row.tagId)) {
      entry.tags.push({
        id: row.tagId,
        name: row.tagName ?? "Unnamed tag",
        color: row.tagColor,
      });
    }

    entriesById.set(row.id, entry);
  }

  for (const entry of entriesById.values()) {
    if (entry.tags.length === 0) {
      entry.tags = productTagMap.get(entry.productId) ?? [fallbackTag];
    }
  }

  return Array.from(entriesById.values());
}

function buildAvailableTags(
  entries: AnalyticsV2Entry[],
): AnalyticsV2AvailableTag[] {
  const tagMap = new Map<string, AnalyticsV2AvailableTag>();

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    for (const tag of entry.tags) {
      const existing = tagMap.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        amount: 0,
      };
      existing.amount += entry.amount / entry.tags.length;
      tagMap.set(tag.id, existing);
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => b.amount - a.amount);
}

function buildDashboardPayload(
  entries: AnalyticsV2Entry[],
  comparisonEntries: AnalyticsV2Entry[],
  period: AnalyticsV2Period,
  comparisonPeriod: AnalyticsV2Period,
  now: Date,
) {
  const kpis = buildKpis(entries, period, now);
  const comparisonKpis = buildKpis(comparisonEntries, comparisonPeriod, now);
  const trends = buildTrends(entries, period);
  const categoryBreakdown = buildCategoryBreakdown(entries);
  const topStores = buildStoreBreakdown(entries);
  const topProducts = buildProductBreakdown(entries);
  const sourceBreakdown = buildSourceBreakdown(entries);
  const weekdayBreakdown = buildWeekdayBreakdown(entries);
  const transactionDrilldown = buildTransactionDrilldown(entries);

  return {
    kpis,
    comparisonKpis,
    deltas: {
      netFlow: kpis.netFlow - comparisonKpis.netFlow,
      totalExpense: kpis.totalExpense - comparisonKpis.totalExpense,
      savingsRate: kpis.savingsRate - comparisonKpis.savingsRate,
      dailySpend: kpis.averageDailySpend - comparisonKpis.averageDailySpend,
    },
    trends,
    categoryBreakdown,
    topStores,
    topProducts,
    sourceBreakdown,
    weekdayBreakdown,
    transactionDrilldown,
    insights: buildInsights(kpis, comparisonKpis, categoryBreakdown, topStores),
  };
}

function buildKpis(
  entries: AnalyticsV2Entry[],
  period: AnalyticsV2Period,
  now: Date,
): AnalyticsV2Kpis {
  const transactionIds = new Set<string>();
  const activeDays = new Set<string>();
  const reviewTransactionIds = new Set<string>();
  let totalIncome = 0;
  let totalExpense = 0;
  let recurringIncome = 0;
  let recurringExpense = 0;
  let variableIncome = 0;
  let variableExpense = 0;
  let largestExpense = 0;

  for (const entry of entries) {
    transactionIds.add(entry.transactionId);
    activeDays.add(format(entry.date, "yyyy-MM-dd"));
    if (entry.needsReview) reviewTransactionIds.add(entry.transactionId);

    if (entry.type === "income") {
      totalIncome += entry.amount;
      if (entry.source === "recurring") recurringIncome += entry.amount;
      else variableIncome += entry.amount;
    } else {
      totalExpense += entry.amount;
      if (entry.source === "recurring") recurringExpense += entry.amount;
      else variableExpense += entry.amount;
      largestExpense = Math.max(largestExpense, entry.amount);
    }
  }

  const periodDays =
    differenceInCalendarDays(period.endDate, period.startDate) + 1;
  const elapsedDays = getElapsedDays(period, now, periodDays);
  const averageDailySpend = elapsedDays === 0 ? 0 : totalExpense / elapsedDays;
  const projectedExpense = averageDailySpend * periodDays;
  const netFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome === 0 ? 0 : (netFlow / totalIncome) * 100;
  const fixedCoverageRatio =
    totalIncome === 0 ? 0 : (recurringExpense / totalIncome) * 100;

  return {
    totalIncome,
    totalExpense,
    netFlow,
    savingsRate,
    recurringIncome,
    recurringExpense,
    variableIncome,
    variableExpense,
    averageDailySpend,
    projectedExpense,
    fixedCoverageRatio,
    discretionaryShare:
      totalExpense === 0 ? 0 : (variableExpense / totalExpense) * 100,
    transactionCount: transactionIds.size,
    activeDays: activeDays.size,
    needsReviewCount: reviewTransactionIds.size,
    largestExpense,
    averageTransactionExpense:
      transactionIds.size === 0 ? 0 : totalExpense / transactionIds.size,
  };
}

function getElapsedDays(
  period: AnalyticsV2Period,
  now: Date,
  periodDays: number,
) {
  const isCurrentPeriod = period.isYearly
    ? isSameYear(period.startDate, now)
    : isSameMonth(period.startDate, now);

  if (!isCurrentPeriod) return periodDays;
  return Math.max(1, differenceInCalendarDays(now, period.startDate) + 1);
}

function buildTrends(
  entries: AnalyticsV2Entry[],
  period: AnalyticsV2Period,
): AnalyticsV2TrendPoint[] {
  const buckets: AnalyticsV2TrendBucket[] = period.isYearly
    ? eachMonthOfInterval({ start: period.startDate, end: period.endDate }).map(
        (date) => ({
          key: format(date, "yyyy-MM"),
          label: format(date, "MMM"),
          income: 0,
          expense: 0,
        }),
      )
    : eachDayOfInterval({ start: period.startDate, end: period.endDate }).map(
        (date) => ({
          key: format(date, "yyyy-MM-dd"),
          label: format(date, "d"),
          income: 0,
          expense: 0,
        }),
      );

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const entry of entries) {
    const key = period.isYearly
      ? format(entry.date, "yyyy-MM")
      : format(entry.date, "yyyy-MM-dd");
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    if (entry.type === "income") bucket.income += entry.amount;
    else bucket.expense += entry.amount;
  }

  let cumulativeIncome = 0;
  let cumulativeExpense = 0;

  return buckets.map((bucket) => {
    cumulativeIncome += bucket.income;
    cumulativeExpense += bucket.expense;
    return {
      ...bucket,
      netFlow: bucket.income - bucket.expense,
      cumulativeIncome,
      cumulativeExpense,
      cumulativeNetFlow: cumulativeIncome - cumulativeExpense,
    };
  });
}

function buildCategoryBreakdown(
  entries: AnalyticsV2Entry[],
): AnalyticsV2CategoryBreakdownItem[] {
  const categoryMap = new Map<string, AnalyticsV2CategoryAccumulator>();
  const totalExpense = entries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    for (const tag of entry.tags) {
      const existing = categoryMap.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        amount: 0,
        count: 0,
      };
      existing.amount += entry.amount / entry.tags.length;
      existing.count += 1;
      categoryMap.set(tag.id, existing);
    }
  }

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      percent: totalExpense === 0 ? 0 : (category.amount / totalExpense) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildStoreBreakdown(
  entries: AnalyticsV2Entry[],
): AnalyticsV2StoreBreakdownItem[] {
  const stores = new Map<string, AnalyticsV2StoreAccumulator>();

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const name = entry.store ?? "Unknown";
    const existing = stores.get(name) ?? { name, amount: 0, count: 0 };
    existing.amount += entry.amount;
    existing.count += 1;
    stores.set(name, existing);
  }

  return Array.from(stores.values())
    .map((store) => ({
      ...store,
      average: store.count === 0 ? 0 : store.amount / store.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

function buildProductBreakdown(
  entries: AnalyticsV2Entry[],
): AnalyticsV2ProductBreakdownItem[] {
  const products = new Map<string, AnalyticsV2ProductAccumulator>();

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const existing = products.get(entry.productId) ?? {
      id: entry.productId,
      name: entry.productName,
      amount: 0,
      quantity: 0,
      count: 0,
    };
    existing.amount += entry.amount;
    existing.quantity += entry.quantity;
    existing.count += 1;
    products.set(entry.productId, existing);
  }

  return Array.from(products.values())
    .map((product) => ({
      ...product,
      average: product.count === 0 ? 0 : product.amount / product.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

function buildSourceBreakdown(
  entries: AnalyticsV2Entry[],
): AnalyticsV2SourceBreakdownItem[] {
  const sources = new Map<string, AnalyticsV2SourceBreakdownItem>();

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const existing = sources.get(entry.source) ?? {
      source: entry.source,
      amount: 0,
      count: 0,
    };
    existing.amount += entry.amount;
    existing.count += 1;
    sources.set(entry.source, existing);
  }

  return Array.from(sources.values()).sort((a, b) => b.amount - a.amount);
}

function buildWeekdayBreakdown(
  entries: AnalyticsV2Entry[],
): AnalyticsV2WeekdayBreakdownItem[] {
  const weekdays: AnalyticsV2WeekdayAccumulator[] = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ].map((day) => ({ day, amount: 0, count: 0 }));

  for (const entry of entries) {
    if (entry.type !== "expense") continue;
    const index = (entry.date.getDay() + 6) % 7;
    weekdays[index].amount += entry.amount;
    weekdays[index].count += 1;
  }

  return weekdays.map((weekday) => ({
    ...weekday,
    average: weekday.count === 0 ? 0 : weekday.amount / weekday.count,
  }));
}

function buildTransactionDrilldown(entries: AnalyticsV2Entry[]) {
  const transactions = new Map<
    string,
    AnalyticsV2TransactionDrilldownAccumulator
  >();

  for (const entry of entries) {
    const existing = transactions.get(entry.transactionId) ?? {
      id: entry.transactionId,
      date: format(entry.date, "yyyy-MM-dd"),
      store: entry.store,
      description: entry.description,
      source: entry.source,
      needsReview: entry.needsReview,
      income: 0,
      expense: 0,
      itemCount: 0,
      tags: new Map<string, AnalyticsV2Tag>(),
    };

    if (entry.type === "income") existing.income += entry.amount;
    else existing.expense += entry.amount;
    existing.itemCount += entry.quantity;

    for (const tag of entry.tags) existing.tags.set(tag.id, tag);
    transactions.set(entry.transactionId, existing);
  }

  return Array.from(transactions.values())
    .map((transaction) => ({
      ...transaction,
      netFlow: transaction.income - transaction.expense,
      tags: Array.from(transaction.tags.values()),
    }))
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 12);
}

function buildInsights(
  kpis: AnalyticsV2Kpis,
  comparisonKpis: AnalyticsV2Kpis,
  categoryBreakdown: AnalyticsV2CategoryBreakdownItem[],
  topStores: AnalyticsV2StoreBreakdownItem[],
) {
  const insights: AnalyticsV2Insight[] = [];

  const expenseDelta = kpis.totalExpense - comparisonKpis.totalExpense;
  if (expenseDelta > 0) {
    insights.push({
      title: "Spending is up",
      description: `Expenses increased by ${Math.round(expenseDelta)} compared with the previous period.`,
      severity:
        expenseDelta > comparisonKpis.totalExpense * 0.2
          ? "critical"
          : "warning",
    });
  } else if (comparisonKpis.totalExpense > 0) {
    insights.push({
      title: "Spending is down",
      description: `You spent ${Math.round(Math.abs(expenseDelta))} less than the previous period.`,
      severity: "good",
    });
  }

  if (kpis.fixedCoverageRatio > 50) {
    insights.push({
      title: "Fixed costs are heavy",
      description: `${Math.round(kpis.fixedCoverageRatio)}% of income is already committed to recurring expenses.`,
      severity: "warning",
    });
  }

  if (kpis.projectedExpense > kpis.totalIncome && kpis.totalIncome > 0) {
    insights.push({
      title: "Current pace outruns income",
      description:
        "At this spend pace, projected expenses exceed period income.",
      severity: "critical",
    });
  }

  const topCategory = categoryBreakdown[0];
  if (topCategory && topCategory.percent > 35) {
    insights.push({
      title: `${topCategory.name} dominates spend`,
      description: `${Math.round(topCategory.percent)}% of expenses sit in one category.`,
      severity: "info",
    });
  }

  const topStore = topStores[0];
  if (topStore && topStore.amount > kpis.totalExpense * 0.25) {
    insights.push({
      title: `${topStore.name} is a major merchant`,
      description: `${Math.round((topStore.amount / kpis.totalExpense) * 100)}% of expenses went there.`,
      severity: "info",
    });
  }

  if (kpis.needsReviewCount > 0) {
    insights.push({
      title: "Transactions need review",
      description: `${kpis.needsReviewCount} transactions should be checked for accuracy.`,
      severity: "warning",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Nothing urgent detected",
      description:
        "Cashflow, pace, and recurring pressure look stable for this period.",
      severity: "good",
    });
  }

  return insights.slice(0, 5);
}

export const analyticsV2Service = {
  getDashboardData,
};
