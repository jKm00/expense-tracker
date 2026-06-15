import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComparisonDelta } from "@/features/analytics/shared/analytics.models";
import { cn } from "@/lib/utils";

type KpiCardColor = "default" | "income" | "expense";

const valueColorMap: Record<KpiCardColor, string> = {
  default: "",
  income: "text-income",
  expense: "text-expense",
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  color = "default",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  delta?: ComparisonDelta;
  color?: KpiCardColor;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5 py-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={"size-6 rounded-md grid place-items-center"}>
              <Icon className="size-3 text-primary" />
            </div>
          )}
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "mt-1 text-xl font-semibold tracking-tight truncate",
              valueColorMap[color],
            )}
          >
            {value}
          </p>
          {delta && delta.direction !== "neutral" && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                delta.favorable ? "text-income" : "text-expense",
              )}
            >
              {delta.direction === "up" ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              <span>{Math.abs(delta.percentage).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
