import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComparisonDelta } from "../analytics.types";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  delta?: ComparisonDelta;
  icon?: LucideIcon;
  showPercentage?: boolean; // defaults to true; set false for count-based metrics
};

export function SummaryCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  showPercentage = true,
}: SummaryCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            {title}
          </CardTitle>
          {Icon && <Icon className="text-muted-foreground size-4" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
        )}
        {delta && <DeltaIndicator delta={delta} showPercentage={showPercentage} />}
      </CardContent>
    </Card>
  );
}

function DeltaIndicator({
  delta,
  showPercentage = true,
}: {
  delta: ComparisonDelta;
  showPercentage?: boolean;
}) {
  const ArrowIcon =
    delta.direction === "up"
      ? ArrowUp
      : delta.direction === "down"
        ? ArrowDown
        : Minus;

  const colorClass = delta.favorable
    ? "text-green-600 dark:text-green-400"
    : delta.direction === "neutral"
      ? "text-muted-foreground"
      : "text-red-600 dark:text-red-400";

  const percentText =
    delta.percentage !== 0
      ? `${delta.percentage > 0 ? "+" : ""}${delta.percentage.toFixed(1)}%`
      : "";

  const absoluteText =
    delta.absolute !== 0
      ? `${delta.absolute > 0 ? "+" : ""}${delta.absolute.toFixed(2)}`
      : "No change";

  return (
    <div className={cn("flex items-center gap-1 text-xs mt-2", colorClass)}>
      <ArrowIcon className="size-3" />
      {showPercentage && percentText && (
        <span className="font-medium">{percentText}</span>
      )}
      <span className="text-muted-foreground">({absoluteText})</span>
    </div>
  );
}
