import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { TagWithProduct } from "../tags.models";
import { tagsMutations } from "../tags.mutations";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";
import { wait } from "@/utils";

export function DeleteTagDialog({
  tag,
  children,
}: {
  tag: TagWithProduct;
  children: React.ReactNode;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const confirmValue = tag.name.toLowerCase();

  const [open, setOpen] = useState(false);

  const mutation = tagsMutations.deleteTag();

  function handleDelete() {
    if (confirmInput.toLowerCase() !== confirmValue) {
      toast.error("Type the name of the tag to confirm before deleting");
      return;
    }

    mutation.mutate(
      {
        tagId: tag.id,
      },
      {
        onSuccess: (res) => {
          const [err] = res;
          if (err) {
            let message: string;
            const reason = err.reason;
            switch (reason) {
              case "TAG_NOT_FOUND":
                message = "Tag was not found and was therefore not deleted...";
                break;
              case "TAG_UNATHORIZED":
                message = "You do not have perimssion to delete this tag!";
                break;
              case "TAG_DB_ERROR":
              case "TAG_NOT_RETURNED":
                message =
                  "Something unexpected happened when trying to delete the tag. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Tag deleted!");
          }
        },
      },
    );
  }

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      await wait(100);
      setConfirmInput("");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="size-10 flex items-center justify-center bg-destructive/20 rounded-full">
            <AlertTriangle className="text-destructive" />
          </div>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="mb-4">
            This will permanently delete the tag and unlink it from{" "}
            {tag.products.length}{" "}
            {tag.products.length > 1 ? "products" : "product"}. This action
            cannot be undone.
          </AlertDialogDescription>
          <p className="text-muted-foreground text-sm">
            Type '{confirmValue}' to confirm the deletion
          </p>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type '${confirmValue}'`}
          />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoaderButton
            variant="destructive"
            isLoading={mutation.isPending}
            disabled={
              confirmInput.toLowerCase() !== confirmValue || mutation.isPending
            }
            onClick={handleDelete}
          >
            Delete
          </LoaderButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
