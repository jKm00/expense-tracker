import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { analyticsQueries } from "@/features/analytics/analytics.queries";
import { productQueries } from "@/features/products/products.queries";
import { tagsQueries } from "@/features/tags/tags.queries";
import { getComparisonDate } from "@/features/analytics/analytics.utils";
import { MonthSelect } from "@/components/custom/month-select";
import { CalendarRange } from "lucide-react";
import { AnalyticsContentSkeleton } from "@/features/analytics/components/analytics-skeletons";
import { AnalyticsLoader } from "@/features/analytics/components/analytics-loader";
import { CompareSelect } from "@/features/analytics/components/compare.select";

const anaylyticsSchema = z.object({
  comparison: z.enum(["year", "month"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year, comparison } }) => ({
    month,
    year,
    comparison,
  }),
  loader: async ({ context, deps }) => {
    // Prefetch current month transactions
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.year, deps.month),
    );

    // Prefetch comparison month transactions
    const { compareYear, compareMonth } = getComparisonDate(
      deps.year,
      deps.month,
      deps.comparison,
    );
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(compareYear, compareMonth),
    );

    // Prefetch recurring entries for the recurring expenses chart
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringsOptions(),
    );
    context.queryClient.prefetchQuery(analyticsQueries.getPreferencesOptions());
    context.queryClient.prefetchQuery(productQueries.getProductsOptions());
    context.queryClient.prefetchQuery(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader>
          <PageHeaderTitle>Analytics</PageHeaderTitle>
          <PageHeaderDescription>
            Insights into your spending habits
          </PageHeaderDescription>
        </PageHeader>

        <div className="rounded-xl border bg-card p-3 shadow-sm lg:min-w-[360px]">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarRange className="size-3.5" />
            Period
          </div>
          <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px]">
            <MonthSelect
              from="/_app/dashboard/analytics"
              to="/dashboard/analytics"
            />
            <CompareSelect className="h-8 w-full" />
          </div>
        </div>
      </div>

      <Suspense fallback={<AnalyticsContentSkeleton />}>
        <AnalyticsLoader />
      </Suspense>
    </div>
  );
}
