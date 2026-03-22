import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { tagQueries } from "../tag.queries";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "../tag.models";
import { tagMutations } from "../tag.mutations";
import { ProductWithTags } from "@/features/products/product.models";

export function LinkTagToProductDialog({
  product,
}: {
  product: ProductWithTags;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: tagsReponse } = useQuery(tagQueries.getTagsOptions());
  const [_, tags] = useMemo(() => tagsReponse || [null, []], [tagsReponse]);
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    const mappedProductTags = product.tags.map((t) => t.id);
    return tags.filter((tag) => !mappedProductTags.includes(tag.id));
  }, [tags, product]);

  const mutation = tagMutations.linkTagToProduct();

  function handleOpenChange(isOpen: boolean) {
    setSelected(null);
    setOpen(isOpen);
  }

  function handleSubmit() {
    if (!selected) return;
    setError(null);

    mutation.mutate(
      {
        tagId: selected.id,
        productId: product.id,
      },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            setError(err.message);
          } else {
            setSelected(null);
            setOpen(false);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Add tag to product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add tag</DialogTitle>
          <DialogDescription>Add tag to product</DialogDescription>
        </DialogHeader>
        <div>
          <div className="flex flex-wrap gap-1">
            {filteredTags.map((tag) => (
              <Button
                key={tag.id}
                onClick={() => setSelected(tag)}
                variant={selected?.id === tag.id ? "default" : "outline"}
              >
                {tag.name}
              </Button>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!selected || mutation.isPending}
          >
            Add tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
