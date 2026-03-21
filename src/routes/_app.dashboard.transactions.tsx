import { transactionQueries } from "@/features/transactions/transaction.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions,
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <TransactionsList />
    </Suspense>
  );
}

function TransactionsList() {
  const result = useSuspenseQuery(transactionQueries.getTransactionsOptions);

  if (result.error) {
    return <p>{result.error.message}</p>;
  }

  const [err, data] = result.data;

  if (err) {
    return <p>{err.reason}</p>;
  }

  return (
    <div>
      <h2>Transactions</h2>
      <ul>
        {data.map((row) => (
          <li
            key={row.transaction.id}
            className={`${row.transaction.type === "income" ? "text-green-400" : "text-red-400"}`}
          >
            {row.product?.name} - {row.transaction.price}
          </li>
        ))}
      </ul>
    </div>
  );
}
