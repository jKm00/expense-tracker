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
    <ul>
      {data.map((item) => (
        <li
          key={item.transaction.id}
          className={`${item.transaction.type === "income" ? "text-green-400" : "text-red-400"}`}
        >
          {item.item?.name} - {item.transaction.price}
        </li>
      ))}
    </ul>
  );
}
