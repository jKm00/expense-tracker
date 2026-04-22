import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagBadge } from "@/features/tags/components/tag";
import { DeleteTagDialog } from "@/features/tags/components/delete-tag.dialog";
import { EditTagDialog } from "@/features/tags/components/edit-tag.dialog";
import { tagsQueries } from "@/features/tags/tags.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  ChevronRight,
  Hash,
  Package,
  Palette,
  SquarePen,
  Trash,
} from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/tags/$tagId")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(tagsQueries.getTagOptions(params.tagId));
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<TagDetailsSkeleton />}>
      <TagDetailsContent />
    </Suspense>
  );
}

function TagDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonForm fields={6} />
    </div>
  );
}

function TagDetailsContent() {
  const { tagId } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: [expectedError, tag],
    error: unexpectedError,
  } = useSuspenseQuery(tagsQueries.getTagOptions(tagId));

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "TAG_NOT_FOUND":
        title = "Tag not found";
        message = "Tag not found. Make sure the URL is correct.";
        break;
      case "TAG_UNATHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to view this tag.";
        break;
      case "TAG_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the tag from the database. Please try again!";
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
      <PageHeader>
        <PageHeaderBackButton to="/dashboard/tags" />
        <PageHeaderTitle>Tag Details</PageHeaderTitle>
        <PageHeaderDescription>
          View and edit details of the tag
        </PageHeaderDescription>
        <PageHeaderActions>
          <EditTagDialog tag={tag}>
            <SquarePen className="size-4" />
            <span className="sr-only">Edit tag {tag.name}</span>
          </EditTagDialog>
          <DeleteTagDialog
            tag={tag}
            onDeleted={() => navigate({ to: "/dashboard/tags" })}
          >
            <Trash className="size-4" />
            <span className="sr-only">Delete tag {tag.name}</span>
          </DeleteTagDialog>
        </PageHeaderActions>
      </PageHeader>
      <div className="grid gap-3 @xl:grid-cols-2 @2xl:grid-cols-4">
        <KpiCard
          title="Products"
          value={`${tag.products.length}`}
          subtitle="Linked products"
          icon={Package}
        />
        <KpiCard
          title="Color"
          value={tag.color ?? "None"}
          subtitle="Tag accent"
          icon={Palette}
        />
        <KpiCard
          title="Name"
          value={tag.name}
          subtitle="Current label"
          icon={Hash}
        />
        <KpiCard
          title="Updated"
          value={tag.updatedAt.toLocaleString("en-UK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          subtitle="Last changed"
          icon={Calendar}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>General information about this tag</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tag Name</Label>
            <Input defaultValue={tag.name} readOnly className="bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <Input
              defaultValue={tag.color || "Not specified..."}
              readOnly
              className="bg-muted/30"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Products
        </h2>
        {tag.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No products are linked to this tag
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {tag.products.map((product, idx) => (
              <Link
                key={product.id}
                to="/dashboard/products/$productId"
                params={{ productId: product.id }}
                className="block"
              >
                <div
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== tag.products.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                    <Package className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
