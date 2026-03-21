import { RecurringItemDialog } from "@/features/products/components/recurring-item.dialog";
import { productQueries } from "@/features/products/product.queries";
import { CreateRecurringTransactionDialog } from "@/features/transactions/components/create-recurring-transaction.dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(productQueries.getRecurringOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex justify-between">
        <h2>Recurring Transactions</h2>
        <CreateRecurringTransactionDialog />
      </div>
      <Suspense fallback={<p>Loading recurring products...</p>}>
        <RecurringList />
      </Suspense>
    </div>
  );
}

function RecurringList() {
  const { data } = useSuspenseQuery(productQueries.getRecurringOptions());

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
        <RecurringItemDialog key={item.id} item={item} />
      ))}
    </div>
  );
}
