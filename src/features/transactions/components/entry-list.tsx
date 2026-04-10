import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Package } from "lucide-react";
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
    <div className="grid gap-2">
      {title}
      {hasEntries ? (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to="/dashboard/products/$productId"
              params={{ productId: entry.productId }}
            >
              <Card>
                <CardContent className="flex justify-between items-center gap-4">
                  <h3 className="font-semibold">{entry.products?.name}</h3>
                  <div className="flex items-center gap-4">
                    <p>{entry.quantity} Qty</p>
                    <p>{entry.price} per pcs</p>
                    <p
                      className={`${entry.type === "expense" ? "text-red-400" : "text-green-400"}`}
                    >
                      {entry.type === "expense" ? "-" : ""}
                      {Number(entry.price) * entry.quantity}
                    </p>
                  </div>
                </CardContent>
              </Card>
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
  return <h2 className="text-muted-foreground text-sm">{children}</h2>;
}

function EntryListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Package}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { EntryList, EntryListTitle, EntryListEmpty };
