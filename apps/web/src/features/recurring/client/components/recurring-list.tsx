import { Link } from "@tanstack/react-router";
import { RecurringWithProduct } from "@/features/recurring/shared/recurring.models";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { ChevronRight, Repeat } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/utils/format";

function RecurringList({
  items,
  children,
}: {
  items: RecurringWithProduct[];
  children: React.ReactNode;
}) {
  const hasItems = items.length > 0;

  const title = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === RecurringListTitle,
  );

  const emptyMessage = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === RecurringListEmpty,
  );

  return (
    <div className="space-y-2">
      {title}
      {hasItems ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              to="/dashboard/recurring/$id"
              params={{ id: item.id }}
              className="block"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== items.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Repeat className="size-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.products?.name ?? "Unknown product"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatAmount(item.price)}/{item.interval}
                    </span>
                    <Badge
                      variant={
                        item.type === "expense" ? "destructive" : "default"
                      }
                      className={`text-[10px] px-1.5 py-0 ${item.type === "income" ? "border-income/30 bg-income/10 text-income" : ""}`}
                    >
                      {item.type}
                    </Badge>
                  </div>
                </div>
                <Badge
                  variant={item.isActive ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {item.isActive ? "Active" : "Paused"}
                </Badge>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        emptyMessage
      )}
    </div>
  );
}

function RecurringListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function RecurringListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Repeat}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { RecurringList, RecurringListTitle, RecurringListEmpty };
