import { describe, expect, it } from "vitest";
import { AnalyticsMetrics } from "./analytics.models";
import { calculateMonthScore } from "./analytics.score";

const baseMetrics: AnalyticsMetrics = {
  netBalance: 2_000,
  totalIncome: 10_000,
  totalExpenses: 8_000,
  largest: 2_000,
  savingsRate: 20,
  transactionCount: 40,
  itemsPerTransaction: 2,
  totalItems: 80,
  avgItemValue: 100,
  dailySpending: 258,
  activeDays: 20,
};

describe("calculateMonthScore", () => {
  it("returns insufficient data when either month has no transactions", () => {
    const result = calculateMonthScore({
      metrics: { ...baseMetrics, transactionCount: 0 },
      comparisonMetrics: baseMetrics,
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("insufficient-data");
  });

  it("scores each month independently instead of symmetrically", () => {
    const result = calculateMonthScore({
      metrics: {
        ...baseMetrics,
        netBalance: 4_000,
        totalExpenses: 6_000,
        savingsRate: 40,
        transactionCount: 20,
        itemsPerTransaction: 4,
        totalItems: 80,
        dailySpending: 194,
        activeDays: 10,
      },
      comparisonMetrics: baseMetrics,
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeGreaterThan(50);
    expect(result.comparisonScore).not.toBe(100 - result.currentScore);
    expect(result.delta).toBe(result.currentScore - result.comparisonScore);
    expect(result.positiveDriver.contributionPoints).toBeGreaterThan(0);
  });

  it("keeps a month score stable regardless of selected comparison month", () => {
    const aprilComparison = {
      ...baseMetrics,
      netBalance: 4_000,
      totalExpenses: 6_000,
      savingsRate: 40,
      dailySpending: 200,
    };
    const marchComparison = {
      ...baseMetrics,
      netBalance: -1_000,
      totalExpenses: 11_000,
      savingsRate: -10,
      dailySpending: 355,
    };

    const againstApril = calculateMonthScore({
      metrics: baseMetrics,
      comparisonMetrics: aprilComparison,
      month: 4,
      year: 2026,
      compareMonth: 3,
      compareYear: 2026,
    });
    const againstMarch = calculateMonthScore({
      metrics: baseMetrics,
      comparisonMetrics: marchComparison,
      month: 4,
      year: 2026,
      compareMonth: 2,
      compareYear: 2026,
    });

    expect(againstApril.status).toBe("ready");
    expect(againstMarch.status).toBe("ready");
    if (againstApril.status !== "ready" || againstMarch.status !== "ready") return;

    expect(againstApril.currentScore).toBe(againstMarch.currentScore);
  });

  it("scores negative net balance below the zero baseline", () => {
    const result = calculateMonthScore({
      metrics: {
        ...baseMetrics,
        netBalance: -500,
        totalExpenses: 10_500,
        savingsRate: -5,
        transactionCount: 12,
        itemsPerTransaction: 5,
        activeDays: 6,
      },
      comparisonMetrics: baseMetrics,
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeLessThan(0);
  });

  it("scores expense-only months as poor even when behavior looks good", () => {
    const result = calculateMonthScore({
      metrics: {
        ...baseMetrics,
        netBalance: -2_000,
        totalIncome: 0,
        totalExpenses: 2_000,
        savingsRate: 0,
        transactionCount: 2,
        itemsPerTransaction: 5,
        activeDays: 1,
      },
      comparisonMetrics: baseMetrics,
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeLessThan(0);
    expect(result.negativeDriver.contributionPoints).toBeLessThan(0);
  });

  it("creates meaningful separation between poor and worse negative balances", () => {
    const june = {
      ...baseMetrics,
      netBalance: -1_468,
      totalIncome: 30_000,
      totalExpenses: 31_468,
      savingsRate: -4.9,
      dailySpending: 31_468 / 30,
    };
    const may = {
      ...baseMetrics,
      netBalance: -5_591,
      totalIncome: 30_000,
      totalExpenses: 35_591,
      savingsRate: -18.6,
      dailySpending: 35_591 / 31,
    };

    const result = calculateMonthScore({
      metrics: june,
      comparisonMetrics: may,
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeGreaterThan(result.comparisonScore);
    expect(result.currentScore - result.comparisonScore).toBeGreaterThanOrEqual(10);
  });

  it("normalizes active days and transactions by month length", () => {
    const result = calculateMonthScore({
      metrics: { ...baseMetrics, activeDays: 15, transactionCount: 30 },
      comparisonMetrics: { ...baseMetrics, activeDays: 15, transactionCount: 30 },
      month: 0,
      year: 2026,
      compareMonth: 1,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const activeDays = result.contributions.find(
      (contribution) => contribution.key === "activeDayRate",
    );
    const transactions = result.contributions.find(
      (contribution) => contribution.key === "transactionRate",
    );

    expect(activeDays?.currentValue).toBeCloseTo(15 / 31);
    expect(transactions?.currentValue).toBeCloseTo(30 / 31);
  });
});
