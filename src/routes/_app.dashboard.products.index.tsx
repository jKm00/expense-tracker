import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { Button } from "@/components/ui/button";
import {
  ProductList,
  ProductListEmpty,
  ProductListTitle,
} from "@/features/products/components/product-list";
import { ProductWithTag } from "@/features/products/products.models";
import { productQueries } from "@/features/products/products.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, PackageX, Plus, Tag } from "lucide-react";
import { Suspense, useMemo } from "react";

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold mb-4">Products</h1>
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus /> New product
          </Link>
        </Button>
      </div>
      <Suspense fallback={<ProductsContentSkeleton />}>
        <ProductsContent />
      </Suspense>
    </div>
  );
}

function ProductsContentSkeleton() {
  return (
    <div className="space-y-8">
      <SkeletonList rows={2} />
      <SkeletonList rows={6} />
    </div>
  );
}

function ProductsContent() {
  const {
    data: [expectedError, products],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  const { taggedProducts, untaggedProducts } = useMemo(() => {
    if (!products)
      return {
        taggedProducts: [],
        untaggedProducts: [],
      };

    let taggedProducts: ProductWithTag[] = [];
    let untaggedProducts: ProductWithTag[] = [];

    products.forEach((p) => {
      if (p.tags.length === 0) {
        untaggedProducts.push(p);
      } else {
        taggedProducts.push(p);
      }
    });

    return { taggedProducts, untaggedProducts };
  }, [products]);

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the databse. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happend: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          title="Products"
          value={`${products.length}`}
          subtitle="Number of products"
          icon={Package}
        />
        <KpiCard
          title="Tagged"
          value={`${taggedProducts.length}`}
          subtitle="Number of tagged products"
          icon={Tag}
        />
        <KpiCard
          title="Untagged"
          value={`${untaggedProducts.length}`}
          subtitle="Number of untagged products"
          icon={PackageX}
        />
      </div>
      <ProductList products={untaggedProducts}>
        <ProductListTitle>Untagged products</ProductListTitle>
        <ProductListEmpty>No untagged products found</ProductListEmpty>
      </ProductList>
      <ProductList products={taggedProducts}>
        <ProductListTitle>Tagged products</ProductListTitle>
        <ProductListEmpty>No tagged products found</ProductListEmpty>
      </ProductList>
    </div>
  );
}
