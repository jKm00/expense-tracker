import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import {
  FinancialOverview,
  FinancialOverviewSkeleton,
} from "@/features/analytics/components/financial-overview";
import { CustomizeHomeDialog } from "@/features/home/components/customize-home.dialog";
import { ShortcutsWidget } from "@/features/home/components/shortcuts-widget";
import { homeQueries } from "@/features/home/home.queries";
import { shortcutQueries } from "@/features/shortcuts/shortcuts.queries";
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
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
      context.queryClient.prefetchQuery(shortcutQueries.getShortcutsOptions()),
      context.queryClient.prefetchQuery(homeQueries.getHomeWidgetsOptions()),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          now.getFullYear(),
          now.getMonth(),
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderTitle>Hey, {firstName}</PageHeaderTitle>
        <PageHeaderDescription>
          Your month at a glance.
        </PageHeaderDescription>
        <PageHeaderActions>
          <Suspense fallback={null}>
            <CustomizeHomeDialog />
          </Suspense>
        </PageHeaderActions>
      </PageHeader>

      <Suspense fallback={<FinancialOverviewSkeleton />}>
        <FinancialOverviewSection />
      </Suspense>

      <Suspense>
        <HomeWidgets />
      </Suspense>
    </div>
  );
}

function FinancialOverviewSection() {
  const now = new Date();

  const {
    data: [_, transactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(
      now.getFullYear(),
      now.getMonth(),
    ),
  );

  return <FinancialOverview transactions={transactions || []} />;
}

function HomeWidgets() {
  const {
    data: [_, widgets],
  } = useSuspenseQuery(homeQueries.getHomeWidgetsOptions());

  return (
    <>
      {(widgets ?? [])
        .filter((widget) => widget.enabled)
        .map((widget) =>
          widget.type === "quick_log" ? (
            <QuickLogWidget key={widget.type} />
          ) : (
            <ShortcutsWidget key={widget.type} />
          ),
        )}
    </>
  );
}

function QuickLogWidget() {
  const {
    data: [_, products],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return <SimpleTransactionForm products={products || []} />;
}
