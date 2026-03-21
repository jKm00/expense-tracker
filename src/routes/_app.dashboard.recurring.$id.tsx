import { Button } from "@/components/ui/button";
import { productQueries } from "@/features/products/product.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      productQueries.getRecurringProductOptions(id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<p>Loading... </p>}>
      <RecurringProduct />
    </Suspense>
  );
}

function RecurringProduct() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(
    productQueries.getRecurringProductOptions(id),
  );

  const [edited, setEdited] = useState(false);

  const [err, recurring] = data;

  if (err) {
    // TODO: Handle each error case
    return <p>Error: {err.reason}</p>;
  }

  return (
    <div>
      <h2>{recurring.product.name}</h2>
      <Button disabled={!edited}>Save Changes</Button>
    </div>
  );
}
