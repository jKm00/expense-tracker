import { productQueries } from "@/features/products/product.queries";
import { ProductList } from "@/features/products/components/product-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions(),
    );
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions({
        excludeTaggedProducts: true,
      }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        action={
          <Button asChild size="sm">
            <Link to="/dashboard/products/new">
              <PlusIcon className="size-4 mr-2" />
              New
            </Link>
          </Button>
        }
      />
      <div className="space-y-8">
        <Suspense fallback={<SkeletonList rows={3} />}>
          <UntaggedProductList />
        </Suspense>
        <Suspense fallback={<SkeletonList rows={5} />}>
          <AllProductList />
        </Suspense>
      </div>
    </div>
  );
}

function UntaggedProductList() {
  const { data, error } = useSuspenseQuery(
    productQueries.getProductsOptions({
      excludeTaggedProducts: true,
    }),
  );

  if (error) {
    return (
      <p className="text-muted-foreground">Failed to load untagged products.</p>
    );
  }

  const [err, products] = data;

  if (err || !products) {
    return (
      <p className="text-muted-foreground">Failed to load untagged products.</p>
    );
  }

  return <ProductList products={products} title="Untagged Products" />;
}

function AllProductList() {
  const { data, error } = useSuspenseQuery(productQueries.getProductsOptions());

  if (error) {
    return <p className="text-muted-foreground">Failed to load products.</p>;
  }

  const [err, products] = data;

  if (err || !products) {
    return <p className="text-muted-foreground">Failed to load products.</p>;
  }

  return <ProductList products={products} title="All Products" />;
}
