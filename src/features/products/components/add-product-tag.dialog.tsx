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
import { useState } from "react";
import { tagQueries } from "../tag.queries";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "../tag.models";
import { tagMutations } from "../tag.mutations";

export function AddProductTagDialog({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Tag | null>(null);

  const { data } = useQuery(tagQueries.getTagsOptions());
  const [_, tags] = data || [null, []];

  const mutation = tagMutations.linkTagToProduct(productId);

  function handleOpenChange(isOpen: boolean) {
    setSelected(null);
    setOpen(isOpen);
  }

  function handleSubmit() {
    if (!selected) return;

    mutation.mutate(
      {
        tagId: selected.id,
        productId,
      },
      {
        onSuccess: () => {
          setSelected(null);
          setOpen(false);
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
        <div className="flex gap-1">
          {tags?.map((tag) => (
            <Button
              key={tag.id}
              onClick={() => setSelected(tag)}
              variant={selected?.id === tag.id ? "default" : "outline"}
            >
              {tag.name}
            </Button>
          ))}
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
