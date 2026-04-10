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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hey, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quickly log a transaction below.
        </p>
      </div>
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
