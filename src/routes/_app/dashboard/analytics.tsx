import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { MonthSelect } from "@/components/custom/month-select";
import { Suspense, useState } from "react";
import { Label } from "@/components/ui/label";
import { CompareSelect } from "@/features/analytics/components/compare.select";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { TagSelect } from "@/features/tags/components/tag.select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";

const anaylyticsSchema = z.object({
  comparison: z.enum(["year", "month"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Analytics</PageHeaderTitle>
        <PageHeaderDescription>
          Insights into your spending habits
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}

function AnalyticsContent() {
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
    (tag) => !excludeTags.some((excludeTag) => excludeTag.id === tag.id)
  );

  const availableExcludeTags = allTags.filter(
    (tag) => !includeTags.some((includeTag) => includeTag.id === tag.id)
  );

  return (
    <div className="flex gap-2">
      <div>
        <Label>Date</Label>
        <MonthSelect
          from="/_app/dashboard/analytics"
          to="/dashboard/analytics"
        />
      </div>
      <div>
        <Label>Comparison</Label>
        <CompareSelect />
      </div>
      <div>
        <Label>Including tags</Label>
        <TagSelect
          tags={availableIncludeTags}
          value={includeTags}
          onChange={setIncludeTags}
        />
      </div>
      <div>
        <Label>Excluding tags</Label>
        <TagSelect
          tags={availableExcludeTags}
          value={excludeTags}
          onChange={setExcludeTags}
        />
      </div>
    </div>
  );
}
