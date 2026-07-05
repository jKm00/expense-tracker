import dayjs from "dayjs";
import { AnalyticsMetrics, FixedVariableMetrics } from "./analytics.models";

export type MonthScoreMetricKey =
  | "cashflowRatio"
  | "dailySpendingPressure"
  | "totalExpenseRatio"
  | "largestExpenseConcentration"
  | "averageTransactionSize"
  | "averageItemValue"
  | "fixedExpenseRatio"
  | "variableExpenseRatio"
  | "activeDayRate"
  | "transactionRate"
  | "itemsPerTransaction"
  | "totalItemRate";

export type MonthScoreMetricContribution = {
  key: MonthScoreMetricKey;
  label: string;
  category: string;
  favorableDirection: "up" | "down";
  currentValue: number;
  normalizedScore: number;
  contributionPoints: number;
  maxContributionPoints: number;
  weight: number;
  valueType: "money" | "number" | "percent" | "rate";
};

export type MonthScoreResult =
  | {
      status: "insufficient-data";
      reason: string;
    }
  | {
      status: "ready";
      currentScore: number;
      comparisonScore: number;
      delta: number;
      positiveDriver: MonthScoreMetricContribution;
      negativeDriver: MonthScoreMetricContribution;
      contributions: MonthScoreMetricContribution[];
    };

type CalculateMonthScoreInput = {
  metrics: AnalyticsMetrics;
  comparisonMetrics: AnalyticsMetrics;
  fixedVariableMetrics: FixedVariableMetrics;
  comparisonFixedVariableMetrics: FixedVariableMetrics;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

type CalculateSingleMonthScoreInput = {
  metrics: AnalyticsMetrics;
  fixedVariableMetrics: FixedVariableMetrics;
  month: number;
  year: number;
};

type SingleMonthScore = {
  score: number;
  contributions: MonthScoreMetricContribution[];
};

type ScoreMetricDefinition = {
  key: MonthScoreMetricKey;
  label: string;
  category: string;
  categoryWeight: number;
  metricWeight: number;
  favorableDirection: "up" | "down";
  valueType: MonthScoreMetricContribution["valueType"];
  currentValue: (input: CalculateSingleMonthScoreInput) => number;
  normalizedScore: (input: CalculateSingleMonthScoreInput) => number;
};

const SCORE_METRICS: ScoreMetricDefinition[] = [
  {
    key: "cashflowRatio",
    label: "Cashflow ratio",
    category: "Cashflow",
    categoryWeight: 55,
    metricWeight: 1,
    favorableDirection: "up",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(metrics.netBalance, getFinancialScale(metrics, fixedVariableMetrics)),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreCashflow(metrics, fixedVariableMetrics),
  },
  {
    key: "dailySpendingPressure",
    label: "Daily spending pressure",
    category: "Spending discipline",
    categoryWeight: 25,
    metricWeight: 0.4,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics, month, year }) => {
      const dailyScale = getFinancialScale(metrics, fixedVariableMetrics) / getScoringDays(month, year);
      return getRatio(metrics.dailySpending, dailyScale);
    },
    normalizedScore: ({ metrics, fixedVariableMetrics, month, year }) =>
      scoreExpensePressure(
        metrics.dailySpending,
        getFinancialScale(metrics, fixedVariableMetrics) / getScoringDays(month, year),
      ),
  },
  {
    key: "totalExpenseRatio",
    label: "Total expense ratio",
    category: "Spending discipline",
    categoryWeight: 25,
    metricWeight: 0.25,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(metrics.totalExpenses, getFinancialScale(metrics, fixedVariableMetrics)),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreExpensePressure(
        metrics.totalExpenses,
        getFinancialScale(metrics, fixedVariableMetrics),
      ),
  },
  {
    key: "largestExpenseConcentration",
    label: "Largest expense concentration",
    category: "Spending discipline",
    categoryWeight: 25,
    metricWeight: 0.15,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(metrics.largest, getFinancialScale(metrics, fixedVariableMetrics)),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreLowerRatioIsBetter(metrics.largest, getFinancialScale(metrics, fixedVariableMetrics), [
        { value: 0, score: 100 },
        { value: 0.05, score: 90 },
        { value: 0.2, score: 65 },
        { value: 0.5, score: 25 },
        { value: 1, score: 0 },
      ]),
  },
  {
    key: "averageTransactionSize",
    label: "Average transaction size",
    category: "Spending discipline",
    categoryWeight: 25,
    metricWeight: 0.1,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(getAverageTransaction(metrics), getFinancialScale(metrics, fixedVariableMetrics)),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreLowerRatioIsBetter(
        getAverageTransaction(metrics),
        getFinancialScale(metrics, fixedVariableMetrics),
        [
          { value: 0, score: 100 },
          { value: 0.01, score: 95 },
          { value: 0.03, score: 80 },
          { value: 0.08, score: 55 },
          { value: 0.2, score: 20 },
          { value: 0.4, score: 0 },
        ],
      ),
  },
  {
    key: "averageItemValue",
    label: "Average item value",
    category: "Spending discipline",
    categoryWeight: 25,
    metricWeight: 0.1,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(metrics.avgItemValue, getFinancialScale(metrics, fixedVariableMetrics)),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreLowerRatioIsBetter(
        metrics.avgItemValue,
        getFinancialScale(metrics, fixedVariableMetrics),
        [
          { value: 0, score: 100 },
          { value: 0.005, score: 95 },
          { value: 0.02, score: 80 },
          { value: 0.05, score: 55 },
          { value: 0.15, score: 20 },
          { value: 0.3, score: 0 },
        ],
      ),
  },
  {
    key: "fixedExpenseRatio",
    label: "Fixed expense ratio",
    category: "Expense structure",
    categoryWeight: 10,
    metricWeight: 0.6,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(
        fixedVariableMetrics.fixedExpenses,
        getFinancialScale(metrics, fixedVariableMetrics),
      ),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreLowerRatioIsBetter(
        fixedVariableMetrics.fixedExpenses,
        getFinancialScale(metrics, fixedVariableMetrics),
        [
          { value: 0, score: 100 },
          { value: 0.3, score: 80 },
          { value: 0.5, score: 55 },
          { value: 0.7, score: 25 },
          { value: 1, score: 0 },
        ],
      ),
  },
  {
    key: "variableExpenseRatio",
    label: "Variable expense ratio",
    category: "Expense structure",
    categoryWeight: 10,
    metricWeight: 0.4,
    favorableDirection: "down",
    valueType: "percent",
    currentValue: ({ metrics, fixedVariableMetrics }) =>
      getRatio(
        fixedVariableMetrics.variableExpenses,
        getFinancialScale(metrics, fixedVariableMetrics),
      ),
    normalizedScore: ({ metrics, fixedVariableMetrics }) =>
      scoreLowerRatioIsBetter(
        fixedVariableMetrics.variableExpenses,
        getFinancialScale(metrics, fixedVariableMetrics),
        [
          { value: 0, score: 100 },
          { value: 0.3, score: 85 },
          { value: 0.6, score: 60 },
          { value: 1, score: 30 },
          { value: 1.5, score: 0 },
        ],
      ),
  },
  {
    key: "activeDayRate",
    label: "Active day rate",
    category: "Activity",
    categoryWeight: 10,
    metricWeight: 0.35,
    favorableDirection: "down",
    valueType: "rate",
    currentValue: ({ metrics, month, year }) =>
      metrics.activeDays / getScoringDays(month, year),
    normalizedScore: ({ metrics, month, year }) =>
      scoreByBands(metrics.activeDays / getScoringDays(month, year), [
        { value: 0, score: 100 },
        { value: 0.25, score: 100 },
        { value: 0.5, score: 85 },
        { value: 0.75, score: 60 },
        { value: 1, score: 35 },
      ]),
  },
  {
    key: "transactionRate",
    label: "Transaction rate",
    category: "Activity",
    categoryWeight: 10,
    metricWeight: 0.35,
    favorableDirection: "down",
    valueType: "rate",
    currentValue: ({ metrics, month, year }) =>
      metrics.transactionCount / getScoringDays(month, year),
    normalizedScore: ({ metrics, month, year }) =>
      scoreByBands(metrics.transactionCount / getScoringDays(month, year), [
        { value: 0, score: 100 },
        { value: 0.5, score: 100 },
        { value: 1, score: 80 },
        { value: 2, score: 55 },
        { value: 4, score: 20 },
        { value: 6, score: 0 },
      ]),
  },
  {
    key: "itemsPerTransaction",
    label: "Items per transaction",
    category: "Activity",
    categoryWeight: 10,
    metricWeight: 0.15,
    favorableDirection: "down",
    valueType: "number",
    currentValue: ({ metrics }) => metrics.itemsPerTransaction,
    normalizedScore: ({ metrics }) =>
      scoreByBands(metrics.itemsPerTransaction, [
        { value: 0, score: 100 },
        { value: 2, score: 100 },
        { value: 4, score: 80 },
        { value: 8, score: 55 },
        { value: 15, score: 25 },
        { value: 30, score: 0 },
      ]),
  },
  {
    key: "totalItemRate",
    label: "Total item rate",
    category: "Activity",
    categoryWeight: 10,
    metricWeight: 0.15,
    favorableDirection: "down",
    valueType: "rate",
    currentValue: ({ metrics, month, year }) =>
      metrics.totalItems / getScoringDays(month, year),
    normalizedScore: ({ metrics, month, year }) =>
      scoreByBands(metrics.totalItems / getScoringDays(month, year), [
        { value: 0, score: 100 },
        { value: 2, score: 100 },
        { value: 5, score: 80 },
        { value: 10, score: 50 },
        { value: 20, score: 20 },
        { value: 40, score: 0 },
      ]),
  },
];

export function calculateMonthScore(
  input: CalculateMonthScoreInput,
): MonthScoreResult {
  const { metrics, comparisonMetrics } = input;

  if (metrics.transactionCount === 0) {
    return {
      status: "insufficient-data",
      reason: "Add transactions in this month to calculate a month score.",
    };
  }

  const current = calculateSingleMonthScore({
    metrics,
    fixedVariableMetrics: input.fixedVariableMetrics,
    month: input.month,
    year: input.year,
  });
  const comparison =
    comparisonMetrics.transactionCount === 0
      ? null
      : calculateSingleMonthScore({
          metrics: comparisonMetrics,
          fixedVariableMetrics: input.comparisonFixedVariableMetrics,
          month: input.compareMonth,
          year: input.compareYear,
        });

  return {
    status: "ready",
    currentScore: current.score,
    comparisonScore: comparison?.score ?? current.score,
    delta: comparison ? current.score - comparison.score : 0,
    positiveDriver: current.contributions.reduce((best, contribution) =>
      contribution.normalizedScore > best.normalizedScore ? contribution : best,
    ),
    negativeDriver: current.contributions.reduce((worst, contribution) =>
      contribution.normalizedScore < worst.normalizedScore ? contribution : worst,
    ),
    contributions: current.contributions,
  };
}

function calculateSingleMonthScore(input: CalculateSingleMonthScoreInput): SingleMonthScore {
  const contributions = SCORE_METRICS.map((definition) => {
    const normalizedScore = definition.normalizedScore(input);
    const maxContributionPoints = definition.categoryWeight * definition.metricWeight;
    const contributionPoints = (normalizedScore / 100) * maxContributionPoints;

    return {
      key: definition.key,
      label: definition.label,
      category: definition.category,
      favorableDirection: definition.favorableDirection,
      currentValue: definition.currentValue(input),
      normalizedScore,
      contributionPoints,
      maxContributionPoints,
      weight: maxContributionPoints / 100,
      valueType: definition.valueType,
    };
  });
  const rawScore = contributions.reduce(
    (sum, contribution) => sum + contribution.contributionPoints,
    0,
  );

  return {
    score: clamp(Math.round(rawScore), 0, 100),
    contributions,
  };
}

function scoreCashflow(
  metrics: AnalyticsMetrics,
  fixedVariableMetrics: FixedVariableMetrics,
) {
  const scale = getFinancialScale(metrics, fixedVariableMetrics);

  if (scale > 0) {
    return scoreByBands(metrics.netBalance / scale, [
      { value: -0.5, score: 0 },
      { value: 0, score: 50 },
      { value: 0.2, score: 80 },
      { value: 0.4, score: 100 },
    ]);
  }

  return scoreAbsoluteDeficit(metrics.netBalance);
}

function scoreExpensePressure(value: number, scale: number) {
  if (scale <= 0) return scoreAbsoluteExpense(value);

  return scoreByBands(value / scale, [
    { value: 0, score: 100 },
    { value: 0.6, score: 80 },
    { value: 1, score: 50 },
    { value: 1.5, score: 0 },
  ]);
}

function scoreLowerRatioIsBetter(
  value: number,
  scale: number,
  bands: Array<{ value: number; score: number }>,
) {
  if (scale <= 0) return scoreAbsoluteExpense(value);
  return scoreByBands(value / scale, bands);
}

function scoreAbsoluteDeficit(netBalance: number) {
  if (netBalance >= 0) return 50;

  return scoreByBands(netBalance, [
    { value: -10_000, score: 0 },
    { value: -5_000, score: 15 },
    { value: -1_000, score: 35 },
    { value: 0, score: 50 },
  ]);
}

function scoreAbsoluteExpense(value: number) {
  return scoreByBands(value, [
    { value: 0, score: 100 },
    { value: 1_000, score: 90 },
    { value: 5_000, score: 60 },
    { value: 10_000, score: 30 },
    { value: 20_000, score: 0 },
  ]);
}

function scoreByBands(value: number, bands: Array<{ value: number; score: number }>) {
  const sorted = [...bands].sort((a, b) => a.value - b.value);

  if (value <= sorted[0].value) return sorted[0].score;
  if (value >= sorted[sorted.length - 1].value) {
    return sorted[sorted.length - 1].score;
  }

  for (let i = 1; i < sorted.length; i++) {
    const lower = sorted[i - 1];
    const upper = sorted[i];

    if (value <= upper.value) {
      const progress = (value - lower.value) / (upper.value - lower.value);
      return clamp(lower.score + progress * (upper.score - lower.score), 0, 100);
    }
  }

  return sorted[sorted.length - 1].score;
}

function getFinancialScale(
  metrics: AnalyticsMetrics,
  fixedVariableMetrics: FixedVariableMetrics,
) {
  if (metrics.totalIncome > 0) return metrics.totalIncome;
  if (fixedVariableMetrics.fixedIncome > 0) return fixedVariableMetrics.fixedIncome;
  return 0;
}

function getAverageTransaction(metrics: AnalyticsMetrics) {
  return metrics.transactionCount === 0
    ? 0
    : metrics.totalExpenses / metrics.transactionCount;
}

function getRatio(value: number, scale: number) {
  if (scale <= 0) return 0;
  return value / scale;
}

function getScoringDays(month: number, year: number) {
  const today = dayjs();
  const isCurrentMonth = today.month() === month && today.year() === year;

  if (isCurrentMonth) return today.date();

  return dayjs(new Date(year, month, 1)).daysInMonth();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
