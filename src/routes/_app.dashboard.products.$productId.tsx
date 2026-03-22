import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddTagDialog } from "@/features/tags/components/add-tag.dialog";
import { LinkTagToProductDialog } from "@/features/tags/components/link-tag-to-product.dialog";
import { productQueries } from "@/features/products/product.queries";
import { tagMutations } from "@/features/tags/tag.mutations";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

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
  const mutation = tagMutations.unlinkTagFromProduct();

  const [err, product] = data;
  const tags = product?.tags ?? [];

  const [edited, setEdited] = useState(false);

  function unlinkTag(tagId: string) {
    mutation.mutate(
      {
        tagId,
        productId,
      },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            toast(err.message);
          } else {
            setEdited(false);
          }
        },
      },
    );
  }

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "PRODUCT_NOT_FOUND":
        return <p>Product with id {productId} not found</p>;
      case "PRODUCT_FORBIDDEN":
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
              onClick={() => unlinkTag(tag.id)}
              variant="ghost"
              size="xs"
              className="px-0"
            >
              <X />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <LinkTagToProductDialog productId={product.id} />
        <AddTagDialog />
        <Button
          disabled={!edited}
          onClick={() => console.log("TODO: Save new tags")}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
