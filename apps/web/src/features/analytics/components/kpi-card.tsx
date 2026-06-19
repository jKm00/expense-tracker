import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { ComparisonDelta } from "../analytics.models";
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
    <Card size="sm" className="@container">
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
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p
            className={cn(
              "mt-1 min-w-0 max-w-full break-words text-lg leading-tight font-semibold tracking-tight @sm:text-xl",
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
