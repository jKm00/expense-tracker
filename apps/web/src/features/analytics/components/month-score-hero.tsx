import dayjs from "dayjs";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  MonthScoreMetricContribution,
  MonthScoreResult,
} from "@/features/analytics/analytics.score";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/utils/format";

type MonthScoreHeroProps = {
  score: MonthScoreResult;
  month: number;
  year: number;
  compareMonth: number;
  compareYear: number;
};

export function MonthScoreHero({
  score,
  month,
  year,
  compareMonth,
  compareYear,
}: MonthScoreHeroProps) {
  const monthLabel = formatMonth(month, year);
  const compareMonthLabel = formatMonth(compareMonth, compareYear);

  if (score.status === "insufficient-data") {
    return (
      <Card className="relative overflow-hidden py-0">
        <CardContent className="relative p-4 sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,--alpha(var(--muted)_/_55%),transparent_34%),radial-gradient(circle_at_85%_0%,--alpha(var(--primary)_/_8%),transparent_28%)]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Month score
              </p>
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                Not enough data yet
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {score.reason} The score compares {monthLabel} with{" "}
                {compareMonthLabel} and is calculated on demand.
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-center">
              <p className="text-3xl font-semibold tracking-tight text-muted-foreground">
                --
              </p>
              <p className="text-[11px] text-muted-foreground uppercase">
                score pending
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAhead = score.delta > 0;
  const isBehind = score.delta < 0;
  const isHealthy = score.currentScore > 0;
  const isUnhealthy = score.currentScore < 0;
  const DeltaIcon = isAhead ? ArrowUpRight : isBehind ? ArrowDownRight : Minus;
  const deltaAccentClass = isAhead
    ? "text-income"
    : isBehind
      ? "text-expense"
      : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "relative overflow-hidden py-0 shadow-sm",
        isHealthy && "ring-income/25",
        isUnhealthy && "ring-expense/25",
      )}
    >
      <CardContent className="relative p-4 sm:p-5">
        <div
          className={cn(
            "absolute inset-0 opacity-90",
            isHealthy
              ? "bg-[radial-gradient(circle_at_12%_18%,--alpha(var(--income)_/_14%),transparent_36%),radial-gradient(circle_at_88%_4%,--alpha(var(--primary)_/_7%),transparent_30%)]"
              : isUnhealthy
                ? "bg-[radial-gradient(circle_at_12%_18%,--alpha(var(--expense)_/_13%),transparent_36%),radial-gradient(circle_at_88%_4%,--alpha(var(--primary)_/_7%),transparent_30%)]"
                : "bg-[radial-gradient(circle_at_12%_18%,--alpha(var(--muted)_/_70%),transparent_36%),radial-gradient(circle_at_88%_4%,--alpha(var(--primary)_/_7%),transparent_30%)]",
          )}
        />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-stretch">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
                    <Sparkles className="size-3.5 text-primary" />
                  </div>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Month score
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Health score for {monthLabel}, with {compareMonthLabel} shown for context
                </p>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border bg-card/75 px-2.5 py-1 text-xs font-medium shadow-xs backdrop-blur",
                  deltaAccentClass,
                )}
              >
                <DeltaIcon className="size-3.5" />
                <span>{formatScoreDelta(score.delta)} pts vs {compareMonthLabel}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
              <div>
                <div className="flex items-end gap-2">
                  <p className="text-6xl leading-none font-semibold tracking-[-0.08em] sm:text-7xl">
                    {formatScoreValue(score.currentScore)}
                  </p>
                  <p className="pb-1.5 text-sm font-medium text-muted-foreground">pts</p>
                </div>
                <p className="mt-2 text-sm font-medium">{monthLabel}</p>
              </div>

              <div className="rounded-2xl border bg-card/65 p-3 shadow-xs backdrop-blur">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Comparison
                </p>
                <div className="mt-1 flex items-end gap-1.5">
                  <p className="text-3xl leading-none font-semibold tracking-tight">
                    {formatScoreValue(score.comparisonScore)}
                  </p>
                  <p className="pb-0.5 text-xs text-muted-foreground">pts</p>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {compareMonthLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <DriverNote type="positive" driver={score.positiveDriver} />
            <DriverNote type="negative" driver={score.negativeDriver} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DriverNote({
  type,
  driver,
}: {
  type: "positive" | "negative";
  driver: MonthScoreMetricContribution;
}) {
  const isPositiveNote = type === "positive";
  const hasExpectedContribution = isPositiveNote
    ? driver.contributionPoints > 0
    : driver.contributionPoints < 0;

  return (
    <div className="rounded-2xl border bg-card/70 p-3 shadow-xs backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {isPositiveNote ? "Best lift" : "Biggest drag"}
        </p>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            driver.contributionPoints > 0
              ? "text-income"
              : driver.contributionPoints < 0
                ? "text-expense"
                : "text-muted-foreground",
          )}
        >
          {formatScoreDelta(Math.round(driver.contributionPoints))} pts
        </span>
      </div>
      <p className="mt-2 text-sm font-medium">{driver.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {formatDriverSentence(driver, type, hasExpectedContribution)}
      </p>
    </div>
  );
}

function formatDriverSentence(
  driver: MonthScoreMetricContribution,
  type: "positive" | "negative",
  hasExpectedContribution: boolean,
) {
  if (!hasExpectedContribution) {
    return type === "positive"
      ? `No clear positive lift; ${driver.label.toLowerCase()} was closest to helping.`
      : `No clear negative drag; ${driver.label.toLowerCase()} was the smallest lift.`;
  }

  const value = formatDriverValue(driver);

  if (type === "positive") {
    return `${driver.label} is healthy at ${value}.`;
  }

  return `${driver.label} is dragging the score at ${value}.`;
}

function formatDriverValue(driver: MonthScoreMetricContribution) {
  if (driver.valueType === "money") {
    return `${formatAmount(driver.currentValue, { decimals: 0 })} NOK`;
  }

  if (driver.valueType === "percent") {
    return `${driver.currentValue.toFixed(1)}%`;
  }

  if (driver.valueType === "rate") {
    if (driver.key === "activeDayRate") {
      return `${(driver.currentValue * 100).toFixed(1)}% of days`;
    }

    return `${driver.currentValue.toFixed(1)} per day`;
  }

  return driver.currentValue.toFixed(1);
}

function formatScoreDelta(delta: number) {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function formatScoreValue(score: number) {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

function formatMonth(month: number, year: number) {
  return dayjs(new Date(year, month, 1)).format("MMMM YYYY");
}
