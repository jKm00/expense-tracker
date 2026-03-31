import { MonthSelect } from "@/components/custom/month-select";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import { tagQueries } from "@/features/tags/tag.queries";
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import { AnalyticsContent } from "@/features/analytics/components/analytics-content";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "react";
import z from "zod";
import dayjs from "dayjs";
import { AlertTriangle } from "lucide-react";

const analyticsSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
  compare: z.enum(["nothing", "month", "year"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year, compare } }) => ({
    month,
    year,
    compare,
  }),
  loader: async ({ context, deps }) => {
    const { month, year, compare } = deps;

    context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
    context.queryClient.prefetchQuery(productQueries.getProductsOptions());
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(month, year),
    );

    if (compare && compare !== "nothing") {
      const selected = dayjs()
        .year(year ?? dayjs().year())
        .month(month ?? dayjs().month());
      const compDate =
        compare === "month"
          ? selected.subtract(1, "month")
          : selected.subtract(1, "year");
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          compDate.month(),
          compDate.year(),
        ),
      );
    }
  },
  validateSearch: zodValidator(analyticsSearchSchema),
  component: RouteComponent,
  errorComponent: AnalyticsErrorComponent,
});

function AnalyticsErrorComponent({
  error: _error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics">
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </PageHeader>
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="size-12 text-destructive" />
        <p className="text-muted-foreground text-sm">
          Failed to load analytics data. Please try again.
        </p>
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics">
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </PageHeader>
      {/* TODO: Fix loading skeleton */}
      <Suspense fallback={<p>Loading...</p>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
