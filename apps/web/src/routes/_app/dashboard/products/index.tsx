import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { SkeletonCard } from "@/components/custom/skeletons/skeleton-card";
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
import { Suspense, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Products</PageHeaderTitle>
        <PageHeaderDescription>
          Manage your product catalog
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/products/new">
              <Plus className="size-4" />
              <span className="max-md:sr-only">New product</span>
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<ProductsContentSkeleton />}>
        <ProductsContent />
      </Suspense>
    </div>
  );
}

function ProductsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}

function ProductsContent() {
  const [search, setSearch] = useState("");

  const {
    data: [expectedError, products],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductsOptions());

  const { taggedProducts, untaggedProducts } = useMemo(() => {
    if (!products) {
      return {
        taggedProducts: [],
        untaggedProducts: [],
      };
    }

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

  const filteredTaggedProducts = useMemo(() => {
    return taggedProducts.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [taggedProducts, search]);

  const filteredUntaggedProducts = useMemo(() => {
    return untaggedProducts.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [untaggedProducts, search]);

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
    <div className="space-y-6 @container">
      <div className="grid gap-3 @lg:grid-cols-2 @xl:grid-cols-3">
        <div className="@lg:col-span-2 @xl:col-span-1">
          <KpiCard
            title="Total"
            value={`${products.length}`}
            subtitle="All products"
            icon={Package}
          />
        </div>
        <KpiCard
          title="Tagged"
          value={`${taggedProducts.length}`}
          subtitle="With categories"
          icon={Tag}
        />
        <KpiCard
          title="Untagged"
          value={`${untaggedProducts.length}`}
          subtitle="Needs categorizing"
          icon={PackageX}
        />
      </div>
      <Input
        placeholder="Search..."
        className="max-w-75"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ProductList products={filteredUntaggedProducts}>
        <ProductListTitle>Untagged products</ProductListTitle>
        <ProductListEmpty>No untagged products found</ProductListEmpty>
      </ProductList>
      <ProductList products={filteredTaggedProducts}>
        <ProductListTitle>Tagged products</ProductListTitle>
        <ProductListEmpty>No tagged products found</ProductListEmpty>
      </ProductList>
    </div>
  );
}
