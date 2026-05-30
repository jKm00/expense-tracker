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
import { SkeletonCard } from "@/components/custom/skeletons/skeleton-card";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";
import { TagBadge } from "@/features/tags/components/tag";
import { tagsQueries } from "@/features/tags/tags.queries";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Hash,
  LoaderCircle,
  SquarePen,
  Star,
  Trash,
  TrendingUp,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag.dialog";
import { EditTagDialog } from "@/features/tags/components/edit-tag.dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/dashboard/tags/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(tagsQueries.getTagKpisOptions()),
      context.queryClient.prefetchInfiniteQuery(
        tagsQueries.getTagListOptions(),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Tags</PageHeaderTitle>
        <PageHeaderDescription>
          Organize products with tags
        </PageHeaderDescription>
        <PageHeaderActions>
          <NewTagDialog />
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<TagsContentSkeleton />}>
        <TagContent />
      </Suspense>
    </div>
  );
}

function TagsContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}

function TagContent() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: [expectedError, kpis],
    error: unexpectedError,
  } = useSuspenseQuery(tagsQueries.getTagKpisOptions());
  const {
    data: paginatedData,
    error: listUnexpectedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isListPending,
  } = useInfiniteQuery(
    tagsQueries.getTagListOptions(debouncedSearch || undefined),
  );

  const [listExpectedError, tagPages] = useMemo(() => {
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
          (
            page,
          ): page is NonNullable<(typeof paginatedData.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [paginatedData]);

  const visibleTags = useMemo(
    () => tagPages?.flatMap((page) => page.tags) ?? [],
    [tagPages],
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage || listExpectedError) {
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
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    listExpectedError,
    visibleTags.length,
  ]);

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
          "Something went wrong trying to fetch your tags from the database. Please try again!";
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
      <TagKpis
        count={kpis.count}
        averageReferences={kpis.averageReferences}
        mostUsedTagName={kpis.mostUsedTagName}
      />
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All tags
        </h2>
        {isListPending ? (
          <SkeletonList rows={4} />
        ) : visibleTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "No tags match your search"
                : "No tags created yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {visibleTags.map((tag, idx) => (
              <div
                key={tag.id}
                className={`flex items-center ${idx !== visibleTags.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <Link
                  to="/dashboard/tags/$tagId"
                  params={{ tagId: tag.id }}
                  className="flex-1 flex justify-between py-4 px-4"
                >
                  <div className="flex items-center gap-2">
                    <TagBadge tag={tag} variant="secondary">
                      {tag.name}
                    </TagBadge>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {tag.products.length} ref
                    {tag.products.length !== 1 ? "s" : ""}
                  </span>
                </Link>
                <div className="flex gap-1">
                  <EditTagDialog tag={tag}>
                    <SquarePen className="size-4" />
                    <span className="sr-only">Edit tag {tag.name}</span>
                  </EditTagDialog>
                  <DeleteTagDialog tag={tag}>
                    <Trash className="size-4" />
                    <span className="sr-only">Delete tag {tag.name}</span>
                  </DeleteTagDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        ref={loadMoreRef}
        className="flex min-h-10 items-center justify-center"
      >
        {isListPending ? null : isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading more tags...
          </div>
        ) : visibleTags.length > 0 && !hasNextPage ? (
          <p className="text-sm text-muted-foreground">
            You have reached the end of the tag list.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TagKpis({
  count,
  averageReferences,
  mostUsedTagName,
}: {
  count: number;
  averageReferences: number;
  mostUsedTagName: string | null;
}) {
  return (
    <div className="grid gap-3 @md:grid-cols-2 @xl:grid-cols-3">
      <KpiCard
        title="Count"
        subtitle="Total tags"
        value={`${count}`}
        icon={Hash}
      />
      <KpiCard
        title="References"
        subtitle="Average per tag"
        value={`${averageReferences}`}
        icon={TrendingUp}
      />
      <div className="@md:col-span-2 @xl:col-span-1">
        <KpiCard
          title="Most used"
          subtitle="Top tag"
          value={mostUsedTagName || "-"}
          icon={Star}
        />
      </div>
    </div>
  );
}
