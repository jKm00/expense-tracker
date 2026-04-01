import { Link } from "@tanstack/react-router";
import { ProductWithTag } from "../products.models";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Package } from "lucide-react";
import React from "react";

function ProductList({
  products,
  children,
}: {
  products: ProductWithTag[];
  children: React.ReactNode;
}) {
  const hasProducts = products.length > 0;

  const title = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === ProductListTitle,
  );

  const emptyMessage = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === ProductListEmpty,
  );

  return (
    <div className="grid gap-2">
      {title}
      {hasProducts ? (
        <div className="grid gap-2">
          {products.map((product) => (
            <Link
              key={product.id}
              to="/dashboard/products/$productId"
              params={{ productId: product.id }}
            >
              <Card>
                <CardContent className="flex justify-between items-center gap-4">
                  <h3 className="font-semibold">{product.name}</h3>
                  <div className="space-x- space-x-2">
                    {product.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
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

function ProductListTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-muted-foreground text-sm">{children}</h2>;
}

function ProductListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Package}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { ProductList, ProductListTitle, ProductListEmpty };
