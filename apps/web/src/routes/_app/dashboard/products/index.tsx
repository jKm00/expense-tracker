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
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle, Package, PackageX, Plus, Tag } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesProductSearch(product: ProductWithTag, searchTerm: string) {
  const normalizedSearch = normalizeSearch(searchTerm);
  if (normalizedSearch.length === 0) {
    return true;
  }

  if (normalizeSearch(product.name).includes(normalizedSearch)) {
    return true;
  }

  return product.aliases.some((alias) => {
    const normalizedAliasName = alias.normalizedName || normalizeSearch(alias.name);
    return normalizedAliasName.includes(normalizedSearch);
  });
}

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductKpisOptions()),
      context.queryClient.prefetchInfiniteQuery(
        productQueries.getProductListOptions(),
      ),
    ]);
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: [expectedError, kpis],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductKpisOptions());
  const {
    data: paginatedData,
    error: listUnexpectedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isListPending,
  } = useInfiniteQuery(productQueries.getProductListOptions());

  const [listExpectedError, productPages] = useMemo(() => {
    if (!paginatedData) {
      return [null, null] as const;
    }

    const firstExpectedError = paginatedData.pages
      .map(([pageError]) => pageError)
      .find(Boolean);

    if (firstExpectedError) {
      return [firstExpectedError, null] as const;
    }

    return [
      null,
      paginatedData.pages
        .map(([, page]) => page)
        .filter(
          (page): page is NonNullable<(typeof paginatedData.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [paginatedData]);

  const visibleProducts = useMemo(
    () => productPages?.flatMap((page) => page.products) ?? [],
    [productPages],
  );

  const { visibleTaggedProducts, visibleUntaggedProducts } = useMemo(() => {
    let taggedProducts: ProductWithTag[] = [];
    let untaggedProducts: ProductWithTag[] = [];

    visibleProducts.forEach((p) => {
      if (p.tags.length === 0) {
        untaggedProducts.push(p);
      } else {
        taggedProducts.push(p);
      }
    });

    return { visibleTaggedProducts: taggedProducts, visibleUntaggedProducts: untaggedProducts };
  }, [visibleProducts]);

  const filteredTaggedProducts = useMemo(() => {
    return visibleTaggedProducts.filter((p) => matchesProductSearch(p, search));
  }, [visibleTaggedProducts, search]);

  const filteredUntaggedProducts = useMemo(() => {
    return visibleUntaggedProducts.filter((p) => matchesProductSearch(p, search));
  }, [visibleUntaggedProducts, search]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (
      !target ||
      !hasNextPage ||
      isFetchingNextPage ||
      listExpectedError ||
      search.trim().length > 0
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, listExpectedError, search]);

  if (unexpectedError || listUnexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError || listExpectedError) {
    let title: string;
    let message: string;

    const reason = (expectedError || listExpectedError)!.reason;
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
            value={`${kpis.total}`}
            subtitle="All products"
            icon={Package}
          />
        </div>
        <KpiCard
          title="Tagged"
          value={`${kpis.tagged}`}
          subtitle="With categories"
          icon={Tag}
        />
        <KpiCard
          title="Untagged"
          value={`${kpis.untagged}`}
          subtitle="Needs categorizing"
          icon={PackageX}
        />
      </div>
      <Input
        placeholder="Search..."
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
      <div
        ref={loadMoreRef}
        className="flex min-h-10 items-center justify-center"
      >
        {search.trim().length > 0 || isListPending ? null : isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading more products...
          </div>
        ) : visibleProducts.length > 0 && !hasNextPage ? (
          <p className="text-sm text-muted-foreground">
            You have reached the end of the product list.
          </p>
        ) : null}
      </div>
    </div>
  );
}
