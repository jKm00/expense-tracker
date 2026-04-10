import { Tag } from "@/features/tags/tags.models";
import { ProductWithTag } from "../products.models";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { useMemo, useState } from "react";
import { productMutations } from "../products.mutations";
import { Input } from "@/components/ui/input";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";
import { TagBadge } from "@/features/tags/components/tag";

export function LinkTagForm({
  product,
  tags,
}: {
  product: ProductWithTag;
  tags: Tag[];
}) {
  const [search, setSearch] = useState("");

  const linkMutation = productMutations.linkTagToProduct();
  const unlinkMutation = productMutations.unlinkTagFromProduct();

  const availableTags = useMemo(() => {
    const productTagIds = product.tags.map((t) => t.id);
    return tags.filter((t) => !productTagIds.includes(t.id));
  }, [product, tags]);

  const filteredTags = useMemo(() => {
    return availableTags.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [availableTags, search]);

  function handleLinkTag(tag: Tag) {
    // TODO: Handle errors
    linkMutation.mutate({
      tagId: tag.id,
      productId: product.id,
    });
  }

  function handleUnlinkTag(tag: Tag) {
    // TODO: Handle errors
    unlinkMutation.mutate({
      tagId: tag.id,
      productId: product.id,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-lg font-semibold">Link tags</h2>
          <p className="text-sm text-muted-foreground">
            Link tags to product for analytics
          </p>
        </div>
        <NewTagDialog />
      </div>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Applied tags
          </p>
          {product.tags.length === 0 ? (
            <EmptyState icon={TagIcon} size="md">
              <EmptyStateMessage>No tags applied</EmptyStateMessage>
            </EmptyState>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onClick={() => handleUnlinkTag(tag)}
                >
                  <TagIcon />
                  {tag.name}
                  <X />
                </TagBadge>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Available tags
          </p>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="mb-3"
          />
          {filteredTags.length === 0 ? (
            <EmptyState icon={TagIcon} size="md">
              <EmptyStateMessage>No tags available</EmptyStateMessage>
            </EmptyState>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onClick={() => handleLinkTag(tag)}
                >
                  <TagIcon />
                  {tag.name}
                  <Plus />
                </TagBadge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
