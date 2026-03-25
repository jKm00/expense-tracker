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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LinkTagToProductDialog({
  product,
}: {
  product: ProductWithTags;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const { data: tagsReponse } = useQuery(tagQueries.getTagsOptions());
  const [_, tags] = useMemo(() => tagsReponse || [null, []], [tagsReponse]);
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    const mappedProductTags = product.tags.map((t) => t.id);
    return tags
      .filter((tag) => !mappedProductTags.includes(tag.id))
      .filter((tag) => tag.name.toLowerCase().includes(filter.toLowerCase()));
  }, [tags, product, filter]);

  const mutation = tagMutations.linkTagToProduct();

  function handleOpenChange(isOpen: boolean) {
    setSelected([]);
    setOpen(isOpen);
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      toast.error("Select at least one tag before submitting...");
      return;
    }

    setError(null);

    try {
      await Promise.all(
        selected.map((tag) =>
          mutation.mutateAsync({
            tagId: tag.id,
            productId: product.id,
          }),
        ),
      );
    } catch (error) {
      // TODO: Better error handling
      toast.error("Something went wrong...");
    }

    setSelected([]);
    setOpen(false);
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
        <div className="space-y-4">
          <Input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search..."
          />
          <div className="flex flex-wrap gap-1">
            {filteredTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags found...</p>
            ) : (
              filteredTags.map((tag) => (
                <Button
                  key={tag.id}
                  onClick={() => setSelected((prev) => [...prev, tag])}
                  variant={
                    selected.map((s) => s.id).includes(tag.id)
                      ? "default"
                      : "outline"
                  }
                >
                  {tag.name}
                </Button>
              ))
            )}
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
