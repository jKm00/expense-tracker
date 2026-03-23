import { EmptyState } from "@/components/custom/empty-state";
import { ProductListItem } from "./product-list-item";
import { PackageIcon } from "lucide-react";
import type { ProductWithTags } from "../product.models";

export function ProductList({
  products,
  title,
}: {
  products: ProductWithTags[];
  title?: string;
}) {
  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-lg font-semibold">{title}</h2>
      )}
      {products.length === 0 ? (
        <EmptyState
          message="No products found."
          icon={PackageIcon}
        />
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <ProductListItem key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
