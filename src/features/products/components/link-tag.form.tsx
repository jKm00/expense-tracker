import { Tag } from "@/features/tags/tags.models";
import { ProductWithTag } from "../products.models";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Link tags to product for analytics
            </CardDescription>
          </div>
          <NewTagDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                  className="cursor-pointer"
                >
                  <TagIcon className="size-3" />
                  {tag.name}
                  <X className="size-3" />
                </TagBadge>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                  className="cursor-pointer"
                >
                  <TagIcon className="size-3" />
                  {tag.name}
                  <Plus className="size-3" />
                </TagBadge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
