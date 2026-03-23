import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTagDialog } from "@/features/tags/components/create-tag.dialog";
import { LinkTagToProductDialog } from "@/features/tags/components/link-tag-to-product.dialog";
import { productQueries } from "@/features/products/product.queries";
import { tagMutations } from "@/features/tags/tag.mutations";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { DeleteProductDialog } from "@/features/products/components/delete-product.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X, AlertTriangleIcon } from "lucide-react";
import { Suspense } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  loader: ({ params, context }) => {
    const productId = params.productId;
    context.queryClient.ensureQueryData(
      productQueries.getProductOptions(productId),
    );
    context.queryClient.prefetchQuery(
      productQueries.getProductUsageOptions(productId),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Product Details" />
      <Suspense fallback={<SkeletonForm fields={3} />}>
        <Product />
      </Suspense>
    </div>
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
            toast.error(err.message);
          }
        },
      },
    );
  }

  if (err) {
    return (
      <EmptyState
        message={getErrorMessage(err)}
        icon={AlertTriangleIcon}
      />
    );
  }

  if (!product) {
    return (
      <EmptyState
        message="Product not found."
        icon={AlertTriangleIcon}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Product Name */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProductForm product={product} />
        </CardContent>
      </Card>

      {/* Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            ) : (
              tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                  <Button
                    onClick={() => unlinkTag(tag.id)}
                    variant="ghost"
                    size="xs"
                    className="px-0 ml-1"
                  >
                    <X className="size-3" />
                  </Button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <LinkTagToProductDialog product={product} />
            <CreateTagDialog />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteProductDialog productId={productId} />
        </CardContent>
      </Card>
    </div>
  );
}
