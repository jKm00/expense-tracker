import { describe, expect, it } from "vitest";
import { AnalyticsMetrics, FixedVariableMetrics } from "./analytics.models";
import { calculateMonthScore } from "./analytics.score";

const baseMetrics: AnalyticsMetrics = {
  netBalance: 2_000,
  totalIncome: 10_000,
  totalExpenses: 8_000,
  largest: 1_000,
  savingsRate: 20,
  transactionCount: 20,
  itemsPerTransaction: 2,
  totalItems: 40,
  avgItemValue: 200,
  dailySpending: 8_000 / 30,
  activeDays: 10,
};

const baseFixedVariableMetrics: FixedVariableMetrics = {
  fixedIncome: 10_000,
  fixedExpenses: 3_000,
  variableIncome: 0,
  variableExpenses: 5_000,
};

function scoreMonth({
  metrics = baseMetrics,
  comparisonMetrics = baseMetrics,
  fixedVariableMetrics = baseFixedVariableMetrics,
  comparisonFixedVariableMetrics = baseFixedVariableMetrics,
}: {
  metrics?: AnalyticsMetrics;
  comparisonMetrics?: AnalyticsMetrics;
  fixedVariableMetrics?: FixedVariableMetrics;
  comparisonFixedVariableMetrics?: FixedVariableMetrics;
} = {}) {
  return calculateMonthScore({
    metrics,
    comparisonMetrics,
    fixedVariableMetrics,
    comparisonFixedVariableMetrics,
    month: 5,
    year: 2026,
    compareMonth: 4,
    compareYear: 2026,
  });
}

describe("calculateMonthScore", () => {
  it("returns insufficient data when the selected month has no transactions", () => {
    const result = scoreMonth({
      metrics: { ...baseMetrics, transactionCount: 0 },
    });

    expect(result.status).toBe("insufficient-data");
  });

  it("calculates a selected month score without requiring comparison transactions", () => {
    const result = scoreMonth({
      comparisonMetrics: { ...baseMetrics, transactionCount: 0 },
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeGreaterThan(0);
    expect(result.comparisonScore).toBe(result.currentScore);
    expect(result.delta).toBe(0);
  });

  it("keeps same-ratio months close even when income and expenses differ", () => {
    const lowScale = scoreMonth();
    const highScale = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: 20_000,
        totalIncome: 100_000,
        totalExpenses: 80_000,
        largest: 10_000,
        avgItemValue: 2_000,
        dailySpending: 80_000 / 30,
      },
      fixedVariableMetrics: {
        fixedIncome: 100_000,
        fixedExpenses: 30_000,
        variableIncome: 0,
        variableExpenses: 50_000,
      },
    });

    expect(lowScale.status).toBe("ready");
    expect(highScale.status).toBe("ready");
    if (lowScale.status !== "ready" || highScale.status !== "ready") return;

    expect(highScale.currentScore).toBeCloseTo(lowScale.currentScore, 0);
  });

  it("rewards income-vs-expense efficiency instead of high income by itself", () => {
    const lowIncomeSaver = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: 1_900,
        totalIncome: 2_000,
        totalExpenses: 100,
        largest: 50,
        avgItemValue: 5,
        dailySpending: 100 / 30,
      },
      fixedVariableMetrics: {
        fixedIncome: 2_000,
        fixedExpenses: 50,
        variableIncome: 0,
        variableExpenses: 50,
      },
    });
    const highIncomeSpender = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: 1_000,
        totalIncome: 100_000,
        totalExpenses: 99_000,
        largest: 20_000,
        avgItemValue: 2_500,
        dailySpending: 99_000 / 30,
      },
      fixedVariableMetrics: {
        fixedIncome: 100_000,
        fixedExpenses: 60_000,
        variableIncome: 0,
        variableExpenses: 39_000,
      },
    });

    expect(lowIncomeSaver.status).toBe("ready");
    expect(highIncomeSpender.status).toBe("ready");
    if (lowIncomeSaver.status !== "ready" || highIncomeSpender.status !== "ready") {
      return;
    }

    expect(lowIncomeSaver.currentScore).toBeGreaterThan(
      highIncomeSpender.currentScore,
    );
  });

  it("separates small and large expense-only deficits", () => {
    const smallDeficit = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: -100,
        totalIncome: 0,
        totalExpenses: 100,
        largest: 100,
        savingsRate: 0,
        transactionCount: 1,
        itemsPerTransaction: 1,
        totalItems: 1,
        avgItemValue: 100,
        dailySpending: 100 / 30,
        activeDays: 1,
      },
      fixedVariableMetrics: {
        fixedIncome: 30_000,
        fixedExpenses: 0,
        variableIncome: 0,
        variableExpenses: 100,
      },
    });
    const largeDeficit = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: -10_000,
        totalIncome: 0,
        totalExpenses: 10_000,
        largest: 10_000,
        savingsRate: 0,
        transactionCount: 1,
        itemsPerTransaction: 1,
        totalItems: 1,
        avgItemValue: 10_000,
        dailySpending: 10_000 / 30,
        activeDays: 1,
      },
      fixedVariableMetrics: {
        fixedIncome: 30_000,
        fixedExpenses: 0,
        variableIncome: 0,
        variableExpenses: 10_000,
      },
    });

    expect(smallDeficit.status).toBe("ready");
    expect(largeDeficit.status).toBe("ready");
    if (smallDeficit.status !== "ready" || largeDeficit.status !== "ready") return;

    expect(smallDeficit.currentScore).toBeGreaterThan(largeDeficit.currentScore);
  });

  it("keeps scores inside the 0 to 100 range", () => {
    const result = scoreMonth({
      metrics: {
        ...baseMetrics,
        netBalance: 1_000_000,
        totalIncome: 1_000_000,
        totalExpenses: 0,
        largest: 0,
        savingsRate: 100,
        transactionCount: 1,
        itemsPerTransaction: 1,
        totalItems: 1,
        avgItemValue: 0,
        dailySpending: 0,
        activeDays: 1,
      },
      comparisonMetrics: {
        ...baseMetrics,
        netBalance: -1_000_000,
        totalIncome: 1,
        totalExpenses: 1_000_001,
        largest: 1_000_001,
        savingsRate: -100_000_000,
        transactionCount: 10_000,
        itemsPerTransaction: 100,
        totalItems: 100_000,
        avgItemValue: 10_000,
        dailySpending: 1_000_001,
        activeDays: 31,
      },
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeGreaterThanOrEqual(0);
    expect(result.currentScore).toBeLessThanOrEqual(100);
    expect(result.comparisonScore).toBeGreaterThanOrEqual(0);
    expect(result.comparisonScore).toBeLessThanOrEqual(100);
  });

  it("keeps extreme scores inside the -100 to 100 range", () => {
    const result = calculateMonthScore({
      metrics: {
        ...baseMetrics,
        netBalance: 1_000_000,
        totalIncome: 1_000_000,
        totalExpenses: 0,
        savingsRate: 100,
        transactionCount: 1,
        itemsPerTransaction: 100,
        dailySpending: 0,
        activeDays: 1,
      },
      comparisonMetrics: {
        ...baseMetrics,
        netBalance: -1_000_000,
        totalIncome: 1,
        totalExpenses: 1_000_001,
        savingsRate: -100_000_000,
        transactionCount: 10_000,
        itemsPerTransaction: 0,
        dailySpending: 1_000_001,
        activeDays: 31,
      },
      month: 5,
      year: 2026,
      compareMonth: 4,
      compareYear: 2026,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    expect(result.currentScore).toBeGreaterThanOrEqual(-100);
    expect(result.currentScore).toBeLessThanOrEqual(100);
    expect(result.comparisonScore).toBeGreaterThanOrEqual(-100);
    expect(result.comparisonScore).toBeLessThanOrEqual(100);
  });

  it("normalizes active days and transactions by month length", () => {
    const result = scoreMonth({
      metrics: { ...baseMetrics, activeDays: 15, transactionCount: 30 },
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const activeDays = result.contributions.find(
      (contribution) => contribution.key === "activeDayRate",
    );
    const transactions = result.contributions.find(
      (contribution) => contribution.key === "transactionRate",
    );

    expect(activeDays?.currentValue).toBeCloseTo(15 / 30);
    expect(transactions?.currentValue).toBeCloseTo(30 / 30);
  });
});
