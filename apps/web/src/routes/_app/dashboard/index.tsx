import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { productQueries } from "@/features/products/products.queries";
import { SimpleTransactionForm } from "@/features/transactions/components/simple-transaction.form";
import { useAuth } from "@/features/auth/auth.provider";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions(),
    );
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
      <Suspense>
        <HomeContent />
      </Suspense>
    </div>
  );
}

function HomeContent() {
  const {
    data: [_, products],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return <SimpleTransactionForm products={products || []} />;
}
