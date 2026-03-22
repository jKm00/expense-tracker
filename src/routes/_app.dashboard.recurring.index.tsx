import { Button } from "@/components/ui/button";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex justify-between">
        <h2>Recurring Transactions</h2>
        <Button asChild variant="outline">
          <Link to="/dashboard/recurring/new">Create</Link>
        </Button>
      </div>
      <Suspense fallback={<p>Loading recurring products...</p>}>
        <RecurringList />
      </Suspense>
    </div>
  );
}

function RecurringList() {
  const { data } = useSuspenseQuery(
    recurringQueries.getRecurringProductsOptions(),
  );

  const [error, recurring] = data;

  if (error) {
    const reason = error.reason;
    switch (reason) {
      case "FETCH_RECURRING_ERROR":
        return <p>Failed to fetch recurring items, please try again</p>;
      default:
        return <p>Unkown error: {reason satisfies never}</p>;
    }
  }

  return (
    <div>
      {recurring.map((item) => (
        <Button key={item.id} asChild variant="outline">
          <Link to="/dashboard/recurring/$id" params={{ id: item.id }}>
            {item.product.name}
          </Link>
        </Button>
      ))}
    </div>
  );
}
