import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { NewProductForm } from "@/features/products/client/components/new-product.form";
import { tagsQueries } from "@/features/tags/client/tags.queries";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>New Product</PageHeaderTitle>
        <PageHeaderDescription>
          Add a new product to your product bank
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={1} />}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
