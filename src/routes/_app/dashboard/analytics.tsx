// src/routes/_app/dashboard/analytics.tsx
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { getComparisonDate } from "@/features/analytics/analytics.utils";
import { AnalyticsContentSkeleton } from "@/features/analytics/components/analytics-skeletons";
import { AnalyticsDataLoader } from "@/features/analytics/components/analytics-data-loader";
import {
  AnalyticsFilterSheet,
  AnalyticsFilterTrigger,
} from "@/features/analytics/components/analytics-filter-sheet";

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
    context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());

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
  },
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  const { month, year, comparison } = Route.useSearch();
  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  const activeFilterCount = includeTags.length + excludeTags.length;

  return (
    <div className="space-y-6">
      <AnalyticsFilterSheet
        includeTags={includeTags}
        excludeTags={excludeTags}
        onIncludeTagsChange={setIncludeTags}
        onExcludeTagsChange={setExcludeTags}
      >
        <PageHeader>
          <PageHeaderTitle>Analytics</PageHeaderTitle>
          <PageHeaderDescription>
            Insights into your spending habits
          </PageHeaderDescription>
          <PageHeaderActions>
            <AnalyticsFilterTrigger activeFilterCount={activeFilterCount} />
          </PageHeaderActions>
        </PageHeader>
      </AnalyticsFilterSheet>

      <Suspense fallback={<AnalyticsContentSkeleton />}>
        <AnalyticsDataLoader
          includeTags={includeTags}
          excludeTags={excludeTags}
          month={month}
          year={year}
          comparison={comparison}
        />
      </Suspense>
    </div>
  );
}
