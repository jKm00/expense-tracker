import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { productQueries } from "@/features/products/products.queries";
import { ShortcutForm } from "@/features/shortcuts/components/shortcut.form";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/shortcuts/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      productQueries.getProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>New Shortcut</PageHeaderTitle>
        <PageHeaderDescription>
          Set up a transaction you can log with one tap
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <ShortcutForm />
      </Suspense>
    </div>
  );
}
