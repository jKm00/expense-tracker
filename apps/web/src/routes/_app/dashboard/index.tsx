import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { KpiCardSkeleton } from "@/features/analytics/components/analytics-skeletons";
import { FinancialOverview } from "@/features/analytics/components/financial-overview";
import { productQueries } from "@/features/products/products.queries";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { SimpleTransactionForm } from "@/features/transactions/components/simple-transaction.form";
import { useAuth } from "@/features/auth/auth.provider";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          now.getFullYear(),
          now.getMonth(),
        ),
      ),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          prevMonth.getFullYear(),
          prevMonth.getMonth(),
        ),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Hey, {firstName}</PageHeaderTitle>
        <PageHeaderDescription>
          Quickly log a transaction below.
        </PageHeaderDescription>
      </PageHeader>

      <Suspense fallback={<FinancialOverviewSkeleton />}>
        <FinancialOverviewSection />
      </Suspense>

      <Suspense>
        <HomeContent />
      </Suspense>
    </div>
  );
}

function FinancialOverviewSection() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const {
    data: [_, transactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(
      now.getFullYear(),
      now.getMonth(),
    ),
  );

  const {
    data: [__, prevTransactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
    ),
  );

  return (
    <FinancialOverview
      transactions={transactions || []}
      comparisonTransactions={prevTransactions || []}
    />
  );
}

function FinancialOverviewSkeleton() {
  return (
    <section className="grid gap-3 grid-cols-3">
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
    </section>
  );
}

function HomeContent() {
  const {
    data: [_, products],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return <SimpleTransactionForm products={products || []} />;
}
