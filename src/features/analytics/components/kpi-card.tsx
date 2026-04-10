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
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-1 py-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-primary" />}
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
