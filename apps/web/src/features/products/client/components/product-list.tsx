import { Link } from "@tanstack/react-router";
import { ProductWithTag } from "@/features/products/shared/products.models";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { ChevronRight, Package } from "lucide-react";
import React from "react";
import { TagBadge } from "@/features/tags/client/tag";

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
    <div className="space-y-2">
      {title}
      {hasProducts ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {products.map((product, idx) => (
            <Link
              key={product.id}
              to="/dashboard/products/$id"
              params={{ id: product.id }}
              className="block"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== products.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Package className="size-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  {product.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.tags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} variant="secondary">
                          {tag.name}
                        </TagBadge>
                      ))}
                    </div>
                  )}
                </div>
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

function ProductListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function ProductListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Package}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { ProductList, ProductListEmpty };
