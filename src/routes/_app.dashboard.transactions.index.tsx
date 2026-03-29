import { transactionQueries } from "@/features/transactions/transaction.queries";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const dashboardSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.month, deps.year),
    );
  },
  validateSearch: zodValidator(dashboardSearchSchema),
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
  const { month, year } = Route.useSearch();
  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(month, year),
  );
  const [err, transactions] = data;

  if (err) {
    return (
      <p className="text-muted-foreground">Failed to load transactions.</p>
    );
  }

  return <TransactionList transactions={transactions} />;
}
