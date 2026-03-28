import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { RecurringWithProduct } from "../recurring.models";

export function RecurringListItem({
  recurring,
}: {
  recurring: RecurringWithProduct;
}) {
  const isIncome = recurring.type === "income";

  return (
    <Link
      to="/dashboard/recurring/$id"
      params={{ id: recurring.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`size-2 rounded-full shrink-0 ${
                recurring.isActive ? "bg-green-500" : "bg-muted-foreground"
              }`}
              title={recurring.isActive ? "Active" : "Inactive"}
            />
            <div className="flex flex-col">
              <p className="font-medium truncate">{recurring.product.name}</p>
              <p className="text-muted-foreground text-xs">
                {recurring.startDate.toLocaleString("en-UK", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <Badge variant="secondary" className="text-xs capitalize">
              {recurring.interval}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                isIncome
                  ? "border-green-500/30 text-green-600 dark:text-green-400"
                  : "border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              {recurring.type}
            </Badge>
            <p
              className={`font-semibold ${
                isIncome ? "text-green-400" : "text-red-400"
              }`}
            >
              {isIncome ? "+" : "-"}
              {Number(recurring.price).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
