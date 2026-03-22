import { recurringQueries } from "@/features/recurring/recurring.queries";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductOptions(id),
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
    recurringQueries.getRecurringProductOptions(id),
  );

  const [err, recurring] = data;

  if (err) {
    // TODO: Handle each error case
    return <p>Error: {err.reason}</p>;
  }

  return (
    <div>
      <EditRecurringForm recurring={recurring} />
    </div>
  );
}
