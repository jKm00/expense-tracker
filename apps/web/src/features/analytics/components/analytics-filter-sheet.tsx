import { Tag } from "@/features/tags/tags.models";
import { TagSelect } from "@/features/tags/components/tag.select";
import { MonthSelect } from "@/components/custom/month-select";
import { CompareSelect } from "@/features/analytics/components/compare.select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Calendar, ArrowLeftRight, Tags } from "lucide-react";

type AnalyticsFilterSheetProps = {
  includeTags: Tag[];
  excludeTags: Tag[];
  setIncludeTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setExcludeTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  hasActiveTagFilters: boolean;
  clearTagFilters: () => void;
  availableIncludeTags: Tag[];
  availableExcludeTags: Tag[];
  sheetContentRef: React.RefObject<HTMLDivElement | null>;
};

export function AnalyticsFilterSheet({
  includeTags,
  excludeTags,
  setIncludeTags,
  setExcludeTags,
  hasActiveTagFilters,
  clearTagFilters,
  availableIncludeTags,
  availableExcludeTags,
  sheetContentRef,
}: AnalyticsFilterSheetProps) {
  return (
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
            onChange={setIncludeTags}
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
            onChange={setExcludeTags}
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
  );
}
