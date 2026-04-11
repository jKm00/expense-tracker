import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";
import { TagBadge } from "@/features/tags/components/tag";
import { TagWithProduct } from "@/features/tags/tags.models";
import { tagsQueries } from "@/features/tags/tags.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Hash, SquarePen, Star, Trash, TrendingUp } from "lucide-react";
import { Suspense, useMemo } from "react";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag.dialog";
import { EditTagDialog } from "@/features/tags/components/edit-tag.dialog";

export const Route = createFileRoute("/_app/dashboard/tags/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organize products with tags
          </p>
        </div>
        <NewTagDialog />
      </div>
      {/* TODO: Make and replace to skeleton table */}
      <Suspense fallback={<SkeletonForm />}>
        <TagContent />
      </Suspense>
    </div>
  );
}

function TagContent() {
  const {
    data: [expectedError, tags],
    error: unexpectedError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

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
          "Something went wrong trying to fetch your tags from the databse. Please try again!";
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
      <TagKpis tags={tags} />
      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All tags
        </h2>
        {tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No tags created yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {tags.map((tag, idx) => (
              <div
                key={tag.id}
                className={`flex items-center gap-4 px-4 py-3 ${idx !== tags.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TagBadge tag={tag} variant="secondary">
                      {tag.name}
                    </TagBadge>
                  </div>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {tag.products.length} ref
                  {tag.products.length !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  <EditTagDialog tag={tag}>
                    <SquarePen />
                  </EditTagDialog>
                  <DeleteTagDialog tag={tag}>
                    <Trash />
                  </DeleteTagDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TagKpis({ tags }: { tags: TagWithProduct[] }) {
  const mostUsedTag = useMemo(() => {
    if (tags.length === 0) return null;

    const first = tags[0];
    let max = { count: first.products.length, tag: first };
    tags.forEach((tag) => {
      const count = tag.products.length;
      if (count > max.count) {
        max = { count, tag };
      }
    });

    return max.tag;
  }, [tags]);

  const averageReferences = useMemo(() => {
    if (tags.length === 0) return 0;

    const sum = tags.reduce((acc, curr) => acc + curr.products.length, 0);
    return Math.round((sum / tags.length) * 100) / 100;
  }, [tags]);

  return (
    <div className="grid gap-3 @md:grid-cols-2 @xl:grid-cols-3">
      <KpiCard
        title="Count"
        subtitle="Total tags"
        value={`${tags.length}`}
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
          value={mostUsedTag?.name || "-"}
          icon={Star}
        />
      </div>
    </div>
  );
}
