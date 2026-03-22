import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tagMutations } from "../tag.mutations";

export function CreateTagDialog() {
  const [open, setOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [error, setError] = useState("");
  const mutation = tagMutations.addTag();

  function handleOpenChange(isOpen: boolean) {
    setError("");
    setTagName("");
    setOpen(isOpen);
  }

  function handleSubmit() {
    setError("");

    if (tagName.length === 0) return;

    mutation.mutate(
      {
        name: tagName,
      },
      {
        onSuccess: (data) => {
          const [err] = data;

          if (err) {
            setError(`Tag with name '${tagName}' already exists`);
          } else {
            setTagName("");
            setOpen(false);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Create new tag</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
          <DialogDescription>
            Create a new tag for your products
          </DialogDescription>
        </DialogHeader>
        <div>
          <Input
            type="text"
            placeholder="Tag name..."
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Create tag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
