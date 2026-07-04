import dayjs from "dayjs";
import { AnalyticsMetrics } from "./analytics.models";

export type MonthScoreMetricKey =
  | "savingsRate"
  | "netBalance"
  | "dailySpending"
  | "activeDayRate"
  | "transactionRate"
  | "itemsPerTransaction";

export type MonthScoreMetricContribution = {
  key: MonthScoreMetricKey;
  label: string;
  favorableDirection: "up" | "down";
  currentValue: number;
  contributionPoints: number;
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
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

type ScoreMetricDefinition = {
  key: MonthScoreMetricKey;
  label: string;
  weight: number;
  favorableDirection: "up" | "down";
  valueType: MonthScoreMetricContribution["valueType"];
  currentValue: (input: CalculateSingleMonthScoreInput) => number;
  contributionPoints: (input: CalculateSingleMonthScoreInput) => number;
};

type CalculateSingleMonthScoreInput = {
  metrics: AnalyticsMetrics;
  month: number;
  year: number;
};

type SingleMonthScore = {
  score: number;
  contributions: MonthScoreMetricContribution[];
};

const SCORE_METRICS: ScoreMetricDefinition[] = [
  {
    key: "savingsRate",
    label: "Savings rate",
    weight: 35,
    favorableDirection: "up",
    valueType: "percent",
    currentValue: ({ metrics }) => metrics.savingsRate,
    contributionPoints: ({ metrics }) => scoreSavingsRate(metrics),
  },
  {
    key: "netBalance",
    label: "Net balance",
    weight: 45,
    favorableDirection: "up",
    valueType: "money",
    currentValue: ({ metrics }) => metrics.netBalance,
    contributionPoints: ({ metrics }) => scoreNetBalance(metrics),
  },
  {
    key: "dailySpending",
    label: "Daily spending",
    weight: 20,
    favorableDirection: "down",
    valueType: "money",
    currentValue: ({ metrics }) => metrics.dailySpending,
    contributionPoints: ({ metrics, month, year }) =>
      scoreDailySpending(metrics, getScoringDays(month, year)),
  },
  {
    key: "activeDayRate",
    label: "Active days",
    weight: 6,
    favorableDirection: "down",
    valueType: "rate",
    currentValue: ({ metrics, month, year }) =>
      metrics.activeDays / getScoringDays(month, year),
    contributionPoints: ({ metrics, month, year }) =>
      scoreActiveDayRate(metrics.activeDays / getScoringDays(month, year)),
  },
  {
    key: "transactionRate",
    label: "Transactions",
    weight: 6,
    favorableDirection: "down",
    valueType: "rate",
    currentValue: ({ metrics, month, year }) =>
      metrics.transactionCount / getScoringDays(month, year),
    contributionPoints: ({ metrics, month, year }) =>
      scoreTransactionRate(metrics.transactionCount / getScoringDays(month, year)),
  },
  {
    key: "itemsPerTransaction",
    label: "Items per transaction",
    weight: 6,
    favorableDirection: "up",
    valueType: "number",
    currentValue: ({ metrics }) => metrics.itemsPerTransaction,
    contributionPoints: ({ metrics }) =>
      scoreItemsPerTransaction(metrics.itemsPerTransaction),
  },
];

export function calculateMonthScore(
  input: CalculateMonthScoreInput,
): MonthScoreResult {
  const { metrics, comparisonMetrics } = input;

  if (metrics.transactionCount === 0 || comparisonMetrics.transactionCount === 0) {
    return {
      status: "insufficient-data",
      reason: "Add transactions in both months to calculate a month score.",
    };
  }

  const current = calculateSingleMonthScore({
    metrics,
    month: input.month,
    year: input.year,
  });
  const comparison = calculateSingleMonthScore({
    metrics: comparisonMetrics,
    month: input.compareMonth,
    year: input.compareYear,
  });

  return {
    status: "ready",
    currentScore: current.score,
    comparisonScore: comparison.score,
    delta: current.score - comparison.score,
    positiveDriver: current.contributions.reduce((best, contribution) =>
      contribution.contributionPoints > best.contributionPoints ? contribution : best,
    ),
    negativeDriver: current.contributions.reduce((worst, contribution) =>
      contribution.contributionPoints < worst.contributionPoints ? contribution : worst,
    ),
    contributions: current.contributions,
  };
}

function calculateSingleMonthScore(input: CalculateSingleMonthScoreInput): SingleMonthScore {
  const totalWeight = SCORE_METRICS.reduce(
    (sum, definition) => sum + definition.weight,
    0,
  );
  const contributions = SCORE_METRICS.map((definition) => {
    const contributionPoints = definition.contributionPoints(input);

    return {
      key: definition.key,
      label: definition.label,
      favorableDirection: definition.favorableDirection,
      currentValue: definition.currentValue(input),
      contributionPoints,
      weight: definition.weight / totalWeight,
      valueType: definition.valueType,
    };
  });
  const rawScore = contributions.reduce(
    (sum, contribution) => sum + contribution.contributionPoints,
    0,
  );

  return {
    score: Math.round(rawScore),
    contributions,
  };
}

function scoreSavingsRate(metrics: AnalyticsMetrics) {
  if (metrics.totalIncome <= 0) {
    return metrics.totalExpenses > 0 ? -35 : 0;
  }

  return 35 * dampen(metrics.savingsRate / 20);
}

function scoreNetBalance(metrics: AnalyticsMetrics) {
  const cashflowScale = Math.max(metrics.totalIncome, metrics.totalExpenses, 1);
  const balanceScale = cashflowScale * 0.05;

  return 45 * dampen(metrics.netBalance / balanceScale);
}

function scoreDailySpending(metrics: AnalyticsMetrics, scoringDays: number) {
  if (metrics.totalIncome <= 0) {
    return metrics.totalExpenses > 0 ? -20 : 0;
  }

  const dailyIncome = metrics.totalIncome / scoringDays;
  const spendingPressure = metrics.dailySpending / Math.max(dailyIncome, 1);

  return 20 * dampen((1 - spendingPressure) / 0.2);
}

function scoreActiveDayRate(activeDayRate: number) {
  return 6 * dampen((0.4 - activeDayRate) / 0.2);
}

function scoreTransactionRate(transactionRate: number) {
  return 6 * dampen((0.75 - transactionRate) / 0.5);
}

function scoreItemsPerTransaction(itemsPerTransaction: number) {
  return 6 * dampen((itemsPerTransaction - 2) / 1.5);
}

function getScoringDays(month: number, year: number) {
  const today = dayjs();
  const isCurrentMonth = today.month() === month && today.year() === year;

  if (isCurrentMonth) return today.date();

  return dayjs(new Date(year, month, 1)).daysInMonth();
}

function dampen(value: number) {
  return Math.asinh(value);
}
