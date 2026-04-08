import { Tag } from "@/features/tags/tags.models";
import { ProductWithTag } from "../products.models";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { useMemo, useState } from "react";
import { productMutations } from "../products.mutations";
import { Input } from "@/components/ui/input";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";

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
        <div className="flex justify-between items-end">
          <div>
            <CardTitle>Link tags</CardTitle>
            <CardDescription>
              Link tags to product for analytics
            </CardDescription>
          </div>
          <NewTagDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h2 className="mb-2 font-semibold">Applied tags</h2>
            {product.tags.length === 0 ? (
              <EmptyState icon={TagIcon} size="md">
                <EmptyStateMessage>No tags applied</EmptyStateMessage>
              </EmptyState>
            ) : (
              <div className="flex flex-wrap gap-1">
                {product.tags.map((tag) => (
                  <Badge onClick={() => handleUnlinkTag(tag)}>
                    <TagIcon />
                    {tag.name}
                    <X />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Available tags</h2>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="mb-4"
            />
            {filteredTags.length === 0 ? (
              <EmptyState icon={TagIcon} size="md">
                <EmptyStateMessage>No tags available</EmptyStateMessage>
              </EmptyState>
            ) : (
              <div className="flex flex-wrap gap-1">
                {filteredTags.map((tag) => (
                  <Badge onClick={() => handleLinkTag(tag)}>
                    <TagIcon />
                    {tag.name}
                    <Plus />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
