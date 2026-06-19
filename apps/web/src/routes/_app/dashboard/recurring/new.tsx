import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { NewRecurringForm } from "@/features/recurring/components/new-recurring.form";
import { productQueries } from "@/features/products/products.queries";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
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
        <PageHeaderTitle>New Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Set up a new recurring transaction
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <NewRecurringForm />
      </Suspense>
    </div>
  );
}
