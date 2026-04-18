import React from "react";
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
import { Tag } from "../tags.models";
import { TagBadge } from "./tag";

export function TagSelect({
  tags,
  value,
  onChange,
  placeholder,
  className,
  portalContainer,
}: {
  tags: Tag[];
  value?: Tag[];
  onChange?: (tags: Tag[]) => void;
  placeholder?: string;
  className?: string;
  portalContainer?: React.RefObject<HTMLElement | null>;
}) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      autoHighlight
      items={tags}
      value={value}
      itemToStringValue={(tag: Tag) => tag.id}
      itemToStringLabel={(tag: Tag) => tag.name}
      isItemEqualToValue={(itemValue: Tag, value: Tag) =>
        itemValue.id === value.id
      }
      onValueChange={onChange}
    >
      <ComboboxChips ref={anchor} className={className ?? "w-full max-w-xs"}>
        <ComboboxValue>
          {(values) =>
            values.map((tag: Tag) => (
              <ComboboxChip key={tag.id}>
                <TagBadge tag={tag}>{tag.name}</TagBadge>
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} container={portalContainer}>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(tag) => (
            <ComboboxItem key={tag.id} value={tag}>
              <TagBadge tag={tag}>{tag.name}</TagBadge>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
