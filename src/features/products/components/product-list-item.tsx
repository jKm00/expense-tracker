import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { ProductWithTags } from "../product.models";

export function ProductListItem({ product }: { product: ProductWithTags }) {
  return (
    <Link
      to="/dashboard/products/$productId"
      params={{ productId: product.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between">
          <p className="font-medium truncate">{product.name}</p>
          {product.tags.length > 0 && (
            <div className="flex gap-1 ml-2 shrink-0">
              {product.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
