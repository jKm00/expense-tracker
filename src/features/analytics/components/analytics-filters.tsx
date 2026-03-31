import React from "react";
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
import { FormField } from "@/components/custom/form-field";
import type { Tag } from "@/features/tags/tag.models";
import type { ComparisonType } from "../analytics.types";

type AnalyticsFiltersProps = {
  tags: Tag[];
  includeTags: Tag[];
  excludeTags: Tag[];
  onIncludeTagsChange: (tags: Tag[]) => void;
  onExcludeTagsChange: (tags: Tag[]) => void;
  compare: ComparisonType;
  onCompareChange: (value: ComparisonType) => void;
};

export function AnalyticsFilters({
  tags,
  includeTags,
  excludeTags,
  onIncludeTagsChange,
  onExcludeTagsChange,
  compare,
  onCompareChange,
}: AnalyticsFiltersProps) {
  const includeAnchor = useComboboxAnchor();
  const excludeAnchor = useComboboxAnchor();

  return (
    <div className="grid gap-2 @md:grid-cols-3">
      <FormField label="Include tags">
        <Combobox
          multiple
          autoHighlight
          items={tags}
          value={includeTags}
          onValueChange={onIncludeTagsChange}
          itemToStringValue={(p: Tag) => p.id}
          itemToStringLabel={(p: Tag) => p.name}
        >
          <ComboboxChips ref={includeAnchor} className="w-full">
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
          value={excludeTags}
          onValueChange={onExcludeTagsChange}
          itemToStringValue={(p: Tag) => p.id}
          itemToStringLabel={(p: Tag) => p.name}
        >
          <ComboboxChips ref={excludeAnchor} className="w-full">
            <ComboboxValue placeholder="Exclude tags">
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
        <Select
          value={compare}
          onValueChange={(v) => onCompareChange(v as ComparisonType)}
        >
          <SelectTrigger className="w-full min-w-40">
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
  );
}
