import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productQueries } from "@/features/products/product.queries";
import { Tag } from "@/features/products/tag.models";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  loader: ({ params, context }) => {
    const productId = params.productId;
    context.queryClient.ensureQueryData(
      productQueries.getProductOptions(productId),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<p>Loading product...</p>}>
      <Product />
    </Suspense>
  );
}

function Product() {
  const { productId } = Route.useParams();
  const { data } = useSuspenseQuery(
    productQueries.getProductOptions(productId),
  );

  const [err, product] = data;

  const [edited, setEdited] = useState(false);
  const [tags, setTags] = useState<Tag[]>(product?.tags || []);

  function handleTagRemove(tagId: string) {
    setEdited(true);
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
  }

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "PRODUCT_NOT_FOUND":
        return <p>Product with id {productId} not found</p>;
      case "FORBIDDEN":
        return <p>You do not have access to product with id {productId}</p>;
      default:
        return <p>Unknown error: {reason satisfies never}</p>;
    }
  }

  return (
    <div>
      <h2>Product: {product.name}</h2>
      <h3>Tags</h3>
      <div className="flex gap-2">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline">
            {tag.name}
            <Button
              variant="ghost"
              size="xs"
              className="px-0"
              onClick={() => handleTagRemove(tag.id)}
            >
              <X />
            </Button>
          </Badge>
        ))}
      </div>
      <Button
        disabled={!edited}
        onClick={() => console.log("TODO: Save new tags")}
      >
        Save
      </Button>
    </div>
  );
}
