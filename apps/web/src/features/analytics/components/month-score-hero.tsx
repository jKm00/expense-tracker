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
        <CardContent className="relative p-3 sm:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,--alpha(var(--muted)_/_55%),transparent_34%),radial-gradient(circle_at_85%_0%,--alpha(var(--primary)_/_8%),transparent_28%)]" />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Month score
              </p>
              <h2 className="font-heading text-base font-semibold tracking-tight">
                Not enough data yet
              </h2>
              <p className="max-w-xl text-xs text-muted-foreground">
                {score.reason} The score uses normalized monthly KPIs and is
                calculated on demand.
              </p>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-muted-foreground">
              --
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAhead = score.delta > 0;
  const isBehind = score.delta < 0;
  const isHealthy = score.currentScore >= 70;
  const isUnhealthy = score.currentScore < 50;
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
      <CardContent className="relative p-3 sm:p-4">
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
        <div className="relative grid gap-3 lg:grid-cols-[minmax(210px,0.78fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Month score
                </p>
                <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
                <p className="truncate text-xs text-muted-foreground">
                  {monthLabel}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
                <p className="text-4xl leading-none font-semibold tracking-[-0.07em]">
                  {score.currentScore}
                </p>
                <p className="pb-0.5 text-xs font-medium text-muted-foreground">
                  /100
                </p>
                <div
                  className={cn(
                    "mb-0.5 inline-flex items-center gap-1 text-xs font-medium",
                    deltaAccentClass,
                  )}
                >
                  <DeltaIcon className="size-3.5" />
                  <span>{formatScoreDelta(score.delta)} pts vs {compareMonthLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
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

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {isPositiveNote ? "Best area" : "Needs attention"}
        </p>
        <span className="h-px min-w-3 flex-1 bg-border/80" />
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            driver.normalizedScore >= 70
              ? "text-income"
              : driver.normalizedScore < 50
                ? "text-expense"
                : "text-muted-foreground",
          )}
        >
          {Math.round(driver.normalizedScore)}/100
        </span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-sm font-medium">{driver.label}</p>
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          {formatDriverSentence(driver, type)}
        </p>
      </div>
    </div>
  );
}

function formatDriverSentence(
  driver: MonthScoreMetricContribution,
  type: "positive" | "negative",
) {
  const value = formatDriverValue(driver);

  if (type === "positive") {
    return `${driver.label} is strongest at ${value}.`;
  }

  return `${driver.label} needs attention at ${value}.`;
}

function formatDriverValue(driver: MonthScoreMetricContribution) {
  if (driver.valueType === "money") {
    return `${formatAmount(driver.currentValue, { decimals: 0 })} NOK`;
  }

  if (driver.valueType === "percent") {
    return `${(driver.currentValue * 100).toFixed(1)}%`;
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

function formatMonth(month: number, year: number) {
  return dayjs(new Date(year, month, 1)).format("MMMM YYYY");
}
