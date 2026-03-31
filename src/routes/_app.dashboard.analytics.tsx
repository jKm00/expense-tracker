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
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { productQueries } from "@/features/products/product.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import React, { Suspense } from "react";
import z from "zod";
import { FormField } from "@/components/custom/form-field";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
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

    // Always prefetch: tags, products, current month transactions
    context.queryClient.prefetchQuery(tagQueries.getTagsOptions());
    context.queryClient.prefetchQuery(productQueries.getProductsOptions());
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(month, year),
    );

    // Conditionally prefetch comparison period transactions
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

function AnalyticsErrorComponent({ error: _error, reset }: { error: Error; reset: () => void }) {
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
