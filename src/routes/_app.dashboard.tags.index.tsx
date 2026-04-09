import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";
import { TagWithProduct } from "@/features/tags/tags.models";
import { tagsQueries } from "@/features/tags/tags.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ellipsis, Hash, Star, XLineTop } from "lucide-react";
import { Suspense, useMemo } from "react";

export const Route = createFileRoute("/_app/dashboard/tags/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-2xl font-bold">Tags</h1>
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
    <div className="space-y-4 @container">
      <TagKpis tags={tags} />
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>All available tags</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>References</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>{tag.color || "-"}</TableCell>
                  <TableCell>{tag.products.length}</TableCell>
                  <TableCell className="flex justify-center">
                    <Ellipsis />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
    <div className="grid gap-2 @md:grid-cols-2 @xl:grid-cols-3">
      <KpiCard
        title="Count"
        subtitle="Number of tags"
        value={`${tags.length}`}
        icon={Hash}
      />
      <KpiCard
        title="References"
        subtitle="Average references per tag"
        value={`${averageReferences}`}
        icon={XLineTop}
      />
      <div className="@md:col-span-2 @xl:col-span-1">
        <KpiCard
          title="Most used"
          subtitle="Most used tag"
          value={mostUsedTag?.name || "-"}
          icon={Star}
        />
      </div>
    </div>
  );
}
