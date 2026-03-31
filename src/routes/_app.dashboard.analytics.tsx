import { MonthSelect } from "@/components/custom/month-select";
import { PageHeader } from "@/components/custom/page-header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Tag } from "@/features/tags/tag.models";
import { tagQueries } from "@/features/tags/tag.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import React, { Suspense } from "react";
import z from "zod";
import { FormField } from "@/components/custom/form-field";

const analyticsSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
  },
  validateSearch: zodValidator(analyticsSearchSchema),
  component: RouteComponent,
});

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

function AnalyticsContent() {
  const {
    data: [_, tagsRes],
  } = useSuspenseQuery(tagQueries.getTagsOptions());
  const tags = tagsRes || [];

  const includeAnchor = useComboboxAnchor();
  const excludeAnchor = useComboboxAnchor();

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2">
        <FormField label="Include tags">
          <Combobox
            multiple
            autoHighlight
            items={tags}
            defaultValue={[]}
            itemToStringValue={(p: (typeof tags)[number]) => p.id}
            itemToStringLabel={(p: (typeof tags)[number]) => p.name}
          >
            <ComboboxChips ref={includeAnchor} className="w-full max-w-xs">
              <ComboboxValue placeholder="Include tags">
                {(values) => (
                  <React.Fragment>
                    {values.map((tag: Tag) => (
                      <ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput />
                  </React.Fragment>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={includeAnchor}>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList>
                {(tag: Tag) => (
                  <ComboboxItem key={tag.id} value={tag}>
                    {tag.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </FormField>
        <FormField label="Exclude tags">
          <Combobox
            multiple
            autoHighlight
            items={tags}
            defaultValue={[]}
            itemToStringValue={(p: (typeof tags)[number]) => p.id}
            itemToStringLabel={(p: (typeof tags)[number]) => p.name}
          >
            <ComboboxChips ref={excludeAnchor} className="w-full max-w-xs">
              <ComboboxValue placeholder="Include tags">
                {(values) => (
                  <React.Fragment>
                    {values.map((tag: Tag) => (
                      <ComboboxChip key={tag.id}>{tag.name}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput />
                  </React.Fragment>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={excludeAnchor}>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList>
                {(tag: Tag) => (
                  <ComboboxItem key={tag.id} value={tag}>
                    {tag.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </FormField>
        <FormField label="Compare">
          <Select value="nothing">
            <SelectTrigger className="w-full min-w-40 max-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Compare types</SelectLabel>
                <SelectItem value="nothing">No comparison</SelectItem>
                <SelectItem value="month">Last month</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </div>
  );
}
