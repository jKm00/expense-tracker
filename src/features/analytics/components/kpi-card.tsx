import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5 py-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="size-6 rounded-md bg-primary/10 grid place-items-center">
              <Icon className="size-3 text-primary" />
            </div>
          )}
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
        </div>
        <p className="mt-1 text-xl font-semibold tracking-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
