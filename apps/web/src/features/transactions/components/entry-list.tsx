import { Link } from "@tanstack/react-router";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Package, ShoppingBag } from "lucide-react";
import React from "react";
import { EntryWithProduct } from "../transactions.models";
import { formatAmount } from "@/utils/format";

function EntryList({
  entries,
  children,
}: {
  entries: EntryWithProduct[];
  children: React.ReactNode;
}) {
  const hasEntries = entries.length > 0;

  const title = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === EntryListTitle,
  );

  const emptyMessage = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === EntryListEmpty,
  );

  return (
    <div className="space-y-2">
      {title}
      {hasEntries ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {entries.map((entry, idx) => (
            <Link
              key={entry.id}
              to="/dashboard/products/$id"
              params={{ id: entry.productId }}
              className="block"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== entries.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <ShoppingBag className="size-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.product?.name}
                    {entry.product?.deletedAt && (
                      <span className="ml-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        archived
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.quantity} x {formatAmount(entry.price)},-
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(entry.quantity * Number(entry.price))},-
                </span>
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

function EntryListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function EntryListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Package}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { EntryList, EntryListTitle, EntryListEmpty };
