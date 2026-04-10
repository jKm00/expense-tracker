import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <CardHeader>
                  <CardTitle>{entry.product?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Quantity: <span>{entry.quantity}</span>
                  </p>
                  <p>
                    Price per unit: <span>{entry.price},-</span>
                  </p>
                  <p>
                    Total sum:{" "}
                    <span>
                      {(entry.quantity * Number(entry.price)).toFixed(2)},-
                    </span>
                  </p>
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
