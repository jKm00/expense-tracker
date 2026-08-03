import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
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
} from "@/features/products/components/product-list";
import { productQueries } from "@/features/products/products.queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle, Package, PackageX, Plus, Tag } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type ProductTab = "untagged" | "tagged";

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductKpisOptions()),
      context.queryClient.prefetchInfiniteQuery(
        productQueries.getProductListOptions({ group: "tagged" }),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
  const [activeTab, setActiveTab] = useState<ProductTab>("tagged");
  const debouncedSearch = useDebouncedValue(search, 300);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: [expectedError, kpis],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductKpisOptions());
  const {
    data: untaggedData,
    error: untaggedUnexpectedError,
    fetchNextPage: fetchNextUntaggedPage,
    hasNextPage: hasNextUntaggedPage,
    isFetchingNextPage: isFetchingNextUntaggedPage,
    isPending: isUntaggedPending,
  } = useInfiniteQuery(
    productQueries.getProductListOptions({
      group: "untagged",
      search: debouncedSearch || undefined,
    }),
  );
  const {
    data: taggedData,
    error: taggedUnexpectedError,
    fetchNextPage: fetchNextTaggedPage,
    hasNextPage: hasNextTaggedPage,
    isFetchingNextPage: isFetchingNextTaggedPage,
    isPending: isTaggedPending,
  } = useInfiniteQuery(
    productQueries.getProductListOptions({
      group: "tagged",
      search: debouncedSearch || undefined,
    }),
  );

  const [untaggedExpectedError, untaggedPages] = useMemo(() => {
    if (!untaggedData) {
      return [null, null] as const;
    }

    const firstExpectedError = untaggedData.pages
      .map(([pageError]) => pageError)
      .find(Boolean);

    if (firstExpectedError) {
      return [firstExpectedError, null] as const;
    }

    return [
      null,
      untaggedData.pages
        .map(([, page]) => page)
        .filter(
          (page): page is NonNullable<(typeof untaggedData.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [untaggedData]);

  const [taggedExpectedError, taggedPages] = useMemo(() => {
    if (!taggedData) {
      return [null, null] as const;
    }

    const firstExpectedError = taggedData.pages
      .map(([pageError]) => pageError)
      .find(Boolean);

    if (firstExpectedError) {
      return [firstExpectedError, null] as const;
    }

    return [
      null,
      taggedData.pages
        .map(([, page]) => page)
        .filter(
          (page): page is NonNullable<(typeof taggedData.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [taggedData]);

  const visibleUntaggedProducts = useMemo(
    () => untaggedPages?.flatMap((page) => page.products) ?? [],
    [untaggedPages],
  );

  const visibleTaggedProducts = useMemo(
    () => taggedPages?.flatMap((page) => page.products) ?? [],
    [taggedPages],
  );

  const activeProducts =
    activeTab === "untagged" ? visibleUntaggedProducts : visibleTaggedProducts;
  const activeHasNextPage =
    activeTab === "untagged" ? hasNextUntaggedPage : hasNextTaggedPage;
  const activeIsFetchingNextPage =
    activeTab === "untagged"
      ? isFetchingNextUntaggedPage
      : isFetchingNextTaggedPage;
  const activeIsPending =
    activeTab === "untagged" ? isUntaggedPending : isTaggedPending;
  const activeExpectedError =
    activeTab === "untagged" ? untaggedExpectedError : taggedExpectedError;
  const activeFetchNextPage =
    activeTab === "untagged" ? fetchNextUntaggedPage : fetchNextTaggedPage;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (
      !target ||
      !activeHasNextPage ||
      activeIsFetchingNextPage ||
      activeExpectedError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          activeFetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [
    activeExpectedError,
    activeFetchNextPage,
    activeHasNextPage,
    activeIsFetchingNextPage,
    activeProducts.length,
  ]);

  if (unexpectedError || untaggedUnexpectedError || taggedUnexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError || activeExpectedError) {
    let title: string;
    let message: string;

    const reason = (expectedError || activeExpectedError)!.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the database. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
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
        aria-label="Search products"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("tagged")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeTab === "tagged"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tagged ({kpis.tagged})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("untagged")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeTab === "untagged"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Untagged ({kpis.untagged})
        </button>
      </div>
      {activeIsPending ? (
        <SkeletonList rows={6} />
      ) : activeProducts.length === 0 ? (
        <EmptyState icon={activeTab === "untagged" ? PackageX : Tag}>
          {debouncedSearch ? (
            <>
              <EmptyStateMessage>
                {activeTab === "untagged"
                  ? "No untagged products match your search"
                  : "No tagged products match your search"}
              </EmptyStateMessage>
              <EmptyStateAction>
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              </EmptyStateAction>
            </>
          ) : kpis.total === 0 ? (
            <>
              <EmptyStateMessage>
                You have not added any products yet. Create your first one to get
                started.
              </EmptyStateMessage>
              <EmptyStateAction>
                <Button asChild size="sm" variant="outline">
                  <Link to="/dashboard/products/new">
                    <Plus className="size-4" />
                    Create first product
                  </Link>
                </Button>
              </EmptyStateAction>
            </>
          ) : activeTab === "tagged" ? (
            <>
              <EmptyStateMessage>
                Tag products to see them show up in your tagged list.
              </EmptyStateMessage>
              <EmptyStateAction>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("untagged")}
                >
                  View untagged products
                </Button>
              </EmptyStateAction>
            </>
          ) : (
            <>
              <EmptyStateMessage>
                You have tagged all your products. Nothing to do here right now.
              </EmptyStateMessage>
              <EmptyStateAction>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("tagged")}
                >
                  View tagged products
                </Button>
              </EmptyStateAction>
            </>
          )}
        </EmptyState>
      ) : (
        <ProductList products={activeProducts}>
          <ProductListEmpty>
            {activeTab === "untagged"
              ? "No untagged products found"
              : "No tagged products found"}
          </ProductListEmpty>
        </ProductList>
      )}
      <div
        ref={loadMoreRef}
        className="flex min-h-10 items-center justify-center"
      >
        {activeIsPending ? null : activeIsFetchingNextPage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading more products...
          </div>
        ) : activeProducts.length > 0 && !activeHasNextPage ? (
          <p className="text-sm text-muted-foreground">
            You have reached the end of the product list.
          </p>
        ) : null}
      </div>
    </div>
  );
}
