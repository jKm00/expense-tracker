import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { NewProductForm } from "@/features/products/components/new-product.form";
import { tagsQueries } from "@/features/tags/tags.queries";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Product</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Add a new product to your product bank
        </p>
      </div>
      <Suspense fallback={<SkeletonForm fields={1} />}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
