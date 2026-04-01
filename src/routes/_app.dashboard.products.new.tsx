import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { NewProductForm } from "@/features/products/components/new-product.form";
import { tagsQueries } from "@/features/tags/tags.queries";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1 className="text-2xl font-bold">New Product</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Add a new product to your product bank
      </p>
      <Suspense fallback={<p>TODO: form skeleton</p>}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
