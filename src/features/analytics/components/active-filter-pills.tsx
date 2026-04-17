import { Tag } from "@/features/tags/tags.models";
import { TagBadge } from "@/features/tags/components/tag";
import { X } from "lucide-react";

type ActiveFilterPillsProps = {
  includeTags: Tag[];
  excludeTags: Tag[];
  removeIncludeTag: (tag: Tag) => void;
  removeExcludeTag: (tag: Tag) => void;
  clearTagFilters: () => void;
};

export function ActiveFilterPills({
  includeTags,
  excludeTags,
  removeIncludeTag,
  removeExcludeTag,
  clearTagFilters,
}: ActiveFilterPillsProps) {
  return (
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
  );
}
