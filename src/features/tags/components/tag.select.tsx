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
}: {
  tags: Tag[];
  value?: Tag[];
  onChange?: (tags: Tag[]) => void;
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
      <ComboboxChips ref={anchor} className="w-full max-w-xs">
        <ComboboxValue>
          {(values) =>
            values.map((tag: Tag) => (
              <ComboboxChip key={tag.id}>
                <TagBadge tag={tag}>{tag.name}</TagBadge>
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
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
