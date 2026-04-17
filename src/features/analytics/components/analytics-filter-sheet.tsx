// src/features/analytics/components/analytics-filter-sheet.tsx
import { useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";
import { TagSelect } from "@/features/tags/components/tag.select";
import { TagBadge } from "@/features/tags/components/tag";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MonthSelect } from "@/components/custom/month-select";
import { CompareSelect } from "@/features/analytics/components/compare.select";
import {
  SlidersHorizontal,
  Calendar,
  ArrowLeftRight,
  Tags,
  X,
} from "lucide-react";
import type {
  AnalyticsFilterSheetProps,
  AnalyticsFilterTriggerProps,
} from "@/features/analytics/analytics.models";

export function AnalyticsFilterSheet({
  children,
  includeTags,
  excludeTags,
  onIncludeTagsChange,
  onExcludeTagsChange,
}: AnalyticsFilterSheetProps) {
  const {
    data: [_, tags],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

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

  function clearTagFilters() {
    onIncludeTagsChange([]);
    onExcludeTagsChange([]);
  }

  function removeIncludeTag(tagToRemove: Tag) {
    onIncludeTagsChange(includeTags.filter((t) => t.id !== tagToRemove.id));
  }

  function removeExcludeTag(tagToRemove: Tag) {
    onExcludeTagsChange(excludeTags.filter((t) => t.id !== tagToRemove.id));
  }

  const sheetContentRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet>
      {children}

      {/* Active filter pills — quick glance + quick removal */}
      {hasActiveTagFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {includeTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => removeIncludeTag(tag)}
              className="group inline-flex items-center gap-1"
            >
              <TagBadge
                tag={tag}
                className="cursor-pointer pr-1 transition-opacity group-hover:opacity-70"
              >
                {tag.name}
                <X className="size-3" />
              </TagBadge>
            </button>
          ))}
          {excludeTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => removeExcludeTag(tag)}
              className="group inline-flex items-center gap-1"
            >
              <TagBadge
                tag={tag}
                className="cursor-pointer pr-1 opacity-60 line-through transition-opacity group-hover:opacity-40"
              >
                {tag.name}
                <X className="size-3" />
              </TagBadge>
            </button>
          ))}
          <button
            onClick={clearTagFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Sheet — right side on md+, bottom on mobile */}
      <SheetContent
        side="right"
        className="w-[85%] sm:max-w-sm md:max-w-[380px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Adjust the filters for the analytics dashboard
          </SheetDescription>
        </SheetHeader>

        <div
          ref={sheetContentRef}
          className="flex-1 overflow-y-auto px-4 pb-6 space-y-6"
        >
          {/* Date section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Calendar className="size-3.5" />
              Date
            </div>
            <MonthSelect
              from="/_app/dashboard/analytics"
              to="/dashboard/analytics"
            />
          </div>

          <Separator />

          {/* Comparison section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <ArrowLeftRight className="size-3.5" />
              Comparison
            </div>
            <CompareSelect className="w-full" />
          </div>

          <Separator />

          {/* Include tags section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Tags className="size-3.5" />
              Include tags
            </div>
            <TagSelect
              tags={availableIncludeTags}
              value={includeTags}
              onChange={onIncludeTagsChange}
              placeholder="Search tags..."
              className="w-full"
              portalContainer={sheetContentRef}
            />
          </div>

          <Separator />

          {/* Exclude tags section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Tags className="size-3.5" />
              Exclude tags
            </div>
            <TagSelect
              tags={availableExcludeTags}
              value={excludeTags}
              onChange={onExcludeTagsChange}
              placeholder="Search tags..."
              className="w-full"
              portalContainer={sheetContentRef}
            />
          </div>
        </div>
        {hasActiveTagFilters && (
          <SheetFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={clearTagFilters}
            >
              Clear all filters
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Trigger button for the filter sheet (used in PageHeaderActions) */
export function AnalyticsFilterTrigger({
  activeFilterCount,
}: AnalyticsFilterTriggerProps) {
  return (
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="size-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-0.5 size-5 justify-center px-0"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </SheetTrigger>
  );
}
