import { transactionQueries } from "@/features/transactions/transaction.queries";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
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
    <div className="space-y-6">
      <PageHeader title="Transactions" />
      <Suspense fallback={<SkeletonList rows={8} />}>
        <TransactionsContent />
      </Suspense>
    </div>
  );
}

function TransactionsContent() {
  const { data } = useSuspenseQuery(transactionQueries.getTransactionsOptions);
  const [err, transactions] = data;

  if (err) {
    return <p className="text-muted-foreground">Failed to load transactions.</p>;
  }

  return <TransactionList transactions={transactions} />;
}
