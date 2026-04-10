import { Link } from "@tanstack/react-router";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Package, ShoppingBag } from "lucide-react";
import React from "react";
import { EntryWithProduct } from "../transactions.models";

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
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          {entries.map((entry, idx) => (
            <Link
              key={entry.id}
              to="/dashboard/products/$productId"
              params={{ productId: entry.productId }}
              className="block"
            >
              <div
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== entries.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <ShoppingBag className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {entry.product?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.quantity} x {entry.price},-
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {(entry.quantity * Number(entry.price)).toFixed(2)},-
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
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
