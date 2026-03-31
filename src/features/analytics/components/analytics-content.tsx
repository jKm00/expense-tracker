import { useState, useCallback, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/_app.dashboard.analytics";
import { tagQueries } from "@/features/tags/tag.queries";
import type { Tag } from "@/features/tags/tag.models";
import type { ComparisonType } from "../analytics.types";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { AnalyticsFilters } from "./analytics-filters";
import { SummaryCards } from "./summary-cards";
import { DailySpendingChart } from "./daily-spending-chart";
import { SpendingByTagChart } from "./spending-by-tag-chart";
import { TopProductsChart } from "./top-products-chart";
import { EmptyState } from "@/components/custom/empty-state";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

export function AnalyticsContent() {
  // --- URL search params ---
  const { month: monthParam, year: yearParam, compare: compareParam } =
    Route.useSearch();

  const month = monthParam ?? dayjs().month();
  const year = yearParam ?? dayjs().year();
  const compare: ComparisonType = compareParam ?? "nothing";

  const navigate = useNavigate();

  // --- Local tag filter state ---
  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  // --- Fetch tags for filter comboboxes ---
  const {
    data: [_, tagsResult],
  } = useSuspenseQuery(tagQueries.getTagsOptions());
  const tags = tagsResult ?? [];

  // --- Analytics data hook ---
  const {
    metrics,
    comparisonMetrics,
    deltas,
    dailyData,
    comparisonDailyData,
    tagData,
    comparisonTagData,
    productData,
    isComparing,
    comparisonError,
  } = useAnalyticsData({
    month,
    year,
    comparisonType: compare,
    includeTags: includeTags.map((t) => t.id),
    excludeTags: excludeTags.map((t) => t.id),
  });

  // --- Show toast on comparison error ---
  useEffect(() => {
    if (comparisonError) {
      toast.error("Could not load comparison data.");
    }
  }, [comparisonError]);

  // --- Handlers ---
  const handleCompareChange = useCallback(
    (value: ComparisonType) => {
      navigate({
        to: "/dashboard/analytics",
        search: (prev) => ({
          ...prev,
          compare: value === "nothing" ? undefined : value,
        }),
      });
    },
    [navigate],
  );

  const handleTagClick = useCallback(
    (tagId: string) => {
      if (tagId === "untagged") return;

      // If already the only include tag, clear the filter
      if (includeTags.length === 1 && includeTags[0].id === tagId) {
        setIncludeTags([]);
        return;
      }

      // Set clicked tag as the only include filter
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        setIncludeTags([tag]);
        // Also remove from exclude list to avoid the tag being excluded
        setExcludeTags((prev) => prev.filter((t) => t.id !== tagId));
      }
    },
    [includeTags, tags],
  );

  // --- Empty state ---
  if (metrics.transactionCount === 0 && !isComparing) {
    return (
      <div className="space-y-6">
        <AnalyticsFilters
          tags={tags}
          includeTags={includeTags}
          excludeTags={excludeTags}
          onIncludeTagsChange={setIncludeTags}
          onExcludeTagsChange={setExcludeTags}
          compare={compare}
          onCompareChange={handleCompareChange}
        />
        <EmptyState
          message="No transactions found for this month. Try a different month or adjust your filters."
          icon={BarChart3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <AnalyticsFilters
        tags={tags}
        includeTags={includeTags}
        excludeTags={excludeTags}
        onIncludeTagsChange={setIncludeTags}
        onExcludeTagsChange={setExcludeTags}
        compare={compare}
        onCompareChange={handleCompareChange}
      />

      {/* Summary Cards */}
      <SummaryCards
        metrics={metrics}
        comparisonMetrics={comparisonMetrics}
        deltas={deltas}
      />

      {/* Daily Spending Chart (full width) */}
      <DailySpendingChart
        data={dailyData}
        comparisonData={comparisonDailyData}
        isComparing={isComparing}
      />

      {/* Bottom charts (side by side on desktop) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByTagChart
          data={tagData}
          comparisonData={comparisonTagData}
          onTagClick={handleTagClick}
        />
        <TopProductsChart data={productData} isComparing={isComparing} />
      </div>

    </div>
  );
}
