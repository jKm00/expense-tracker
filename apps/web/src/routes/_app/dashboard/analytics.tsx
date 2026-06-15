import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/client/tags.queries";
import { Tag } from "@/features/tags/shared/tags.models";
import { transactionQueries } from "@/features/transactions/client/transactions.queries";
import { recurringQueries } from "@/features/recurring/client/recurring.queries";
import { getComparisonDate } from "@/features/analytics/shared/analytics.utils";
import { MonthSelect } from "@/components/custom/month-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, ChevronDown, SlidersHorizontal } from "lucide-react";
import { AnalyticsContentSkeleton } from "@/features/analytics/client/components/analytics-skeletons";
import { AnalyticsLoader } from "@/features/analytics/client/components/analytics-loader";
import { CompareSelect } from "@/features/analytics/client/components/compare.select";
import { TagSelect } from "@/features/tags/client/tag.select";
import { cn } from "@/lib/utils";

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
  const { month, year, comparison } = Route.useSearch();
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isMobilePeriodFiltersOpen, setIsMobilePeriodFiltersOpen] =
    useState(false);
  const [isDesktopPeriodFiltersOpen, setIsDesktopPeriodFiltersOpen] =
    useState(false);
  const showMobilePeriodFilters =
    isMobileFiltersOpen && isMobilePeriodFiltersOpen;

  function clearTagFilters() {
    setIncludeTags([]);
    setExcludeTags([]);
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Analytics</PageHeaderTitle>
        <PageHeaderDescription>
          Insights into your spending habits
        </PageHeaderDescription>
      </PageHeader>

      <div className="sticky top-2 z-20 rounded-lg border border-border/50 bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-2 md:hidden">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </div>
          <div className="flex items-center gap-2">
            {hasActiveTagFilters && (
              <Badge variant="secondary" className="size-5 justify-center px-0">
                {activeFilterCount}
              </Badge>
            )}
            <Button
              variant={isMobileFiltersOpen ? "secondary" : "outline"}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => {
                setIsMobileFiltersOpen((prev) => {
                  if (prev) {
                    setIsMobilePeriodFiltersOpen(false);
                  }
                  return !prev;
                });
              }}
            >
              <SlidersHorizontal className="size-3.5" />
              Tags
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  isMobileFiltersOpen && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              Tags
            </div>
            <div className="flex items-center gap-2">
              {hasActiveTagFilters && (
                <Badge variant="secondary" className="size-5 justify-center px-0">
                  {activeFilterCount}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2.5"
                onClick={() => setIsDesktopPeriodFiltersOpen((prev) => !prev)}
              >
                <CalendarRange className="size-3.5" />
                Period
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    isDesktopPeriodFiltersOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-2 grid items-end gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
            !isMobileFiltersOpen && "hidden md:grid",
          )}
        >
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Include tags
            </p>
            <TagSelect
              tags={availableIncludeTags}
              value={includeTags}
              onChange={setIncludeTags}
              placeholder="Search tags..."
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Exclude tags
            </p>
            <TagSelect
              tags={availableExcludeTags}
              value={excludeTags}
              onChange={setExcludeTags}
              placeholder="Search tags..."
              className="w-full"
            />
          </div>

          {hasActiveTagFilters && (
            <div className="space-y-1.5 md:justify-self-end">
              <p className="hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:block">
                Actions
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full md:w-auto"
                onClick={clearTagFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-2 md:hidden",
            !isMobileFiltersOpen && "hidden",
          )}
        >
          <Button
            variant={isMobilePeriodFiltersOpen ? "secondary" : "outline"}
            size="sm"
            className="h-7 gap-1.5 px-2.5"
            onClick={() => setIsMobilePeriodFiltersOpen((prev) => !prev)}
          >
            <CalendarRange className="size-3.5" />
            Period
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                isMobilePeriodFiltersOpen && "rotate-180",
              )}
            />
          </Button>
        </div>

        <div
          className={cn(
            "mt-2 border-t border-border/50 pt-2 md:hidden",
            !showMobilePeriodFilters && "hidden",
          )}
        >
          <div className="grid items-end gap-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Month
              </p>
              <MonthSelect
                from="/_app/dashboard/analytics"
                to="/dashboard/analytics"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Compare
              </p>
              <CompareSelect className="h-8 w-full" comparison={comparison} />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-2 hidden border-t border-border/50 pt-2 md:block",
            !isDesktopPeriodFiltersOpen && "md:hidden",
          )}
        >
          <div className="grid items-end gap-2 md:grid-cols-2 xl:grid-cols-[auto_220px]">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Month
              </p>
              <MonthSelect
                from="/_app/dashboard/analytics"
                to="/dashboard/analytics"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Compare
              </p>
              <CompareSelect className="h-8 w-full" comparison={comparison} />
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<AnalyticsContentSkeleton />}>
        <AnalyticsLoader
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
