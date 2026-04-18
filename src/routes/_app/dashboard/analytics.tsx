import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useRef, useState } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { getComparisonDate } from "@/features/analytics/analytics.utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import { AnalyticsContentSkeleton } from "@/features/analytics/components/analytics-skeletons";
import { AnalyticsFilterSheet } from "@/features/analytics/components/analytics-filter-sheet";
import { ActiveFilterPills } from "@/features/analytics/components/active-filter-pills";
import { AnalyticsLoader } from "@/features/analytics/components/analytics-loader";

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

    // Prefetch recurring entries for the recurring expenses chart
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringsOptions(),
    );
  },
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  const {
    data: [_, tags],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  const allTags = (tags || []).map((tag) => {
    const { products, ...rest } = tag;
    return rest;
  });

  const availableIncludeTags = allTags.filter(
    (tag) => !excludeTags.some((excludeTag) => excludeTag.id === tag.id),
  );

  const availableExcludeTags = allTags.filter(
    (tag) => !includeTags.some((includeTag) => includeTag.id === tag.id),
  );

  const hasActiveTagFilters = includeTags.length > 0 || excludeTags.length > 0;
  const activeFilterCount = includeTags.length + excludeTags.length;

  function clearTagFilters() {
    setIncludeTags([]);
    setExcludeTags([]);
  }

  function removeIncludeTag(tagToRemove: Tag) {
    setIncludeTags((prev) => prev.filter((t) => t.id !== tagToRemove.id));
  }

  function removeExcludeTag(tagToRemove: Tag) {
    setExcludeTags((prev) => prev.filter((t) => t.id !== tagToRemove.id));
  }

  const sheetContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <Sheet>
        <PageHeader>
          <PageHeaderTitle>Analytics</PageHeaderTitle>
          <PageHeaderDescription>
            Insights into your spending habits
          </PageHeaderDescription>
          <PageHeaderActions>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-3.5" />
                Filters
                {hasActiveTagFilters && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 size-5 justify-center px-0"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
          </PageHeaderActions>
        </PageHeader>

        {hasActiveTagFilters && (
          <ActiveFilterPills
            includeTags={includeTags}
            excludeTags={excludeTags}
            removeIncludeTag={removeIncludeTag}
            removeExcludeTag={removeExcludeTag}
            clearTagFilters={clearTagFilters}
          />
        )}

        <AnalyticsFilterSheet
          includeTags={includeTags}
          excludeTags={excludeTags}
          setIncludeTags={setIncludeTags}
          setExcludeTags={setExcludeTags}
          hasActiveTagFilters={hasActiveTagFilters}
          clearTagFilters={clearTagFilters}
          availableIncludeTags={availableIncludeTags}
          availableExcludeTags={availableExcludeTags}
          sheetContentRef={sheetContentRef}
        />
      </Sheet>

      <Suspense fallback={<AnalyticsContentSkeleton />}>
        <AnalyticsLoader includeTags={includeTags} excludeTags={excludeTags} />
      </Suspense>
    </div>
  );
}
