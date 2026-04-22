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
  onDeleted,
}: {
  tag: TagWithProduct;
  children: React.ReactNode;
  onDeleted?: () => void;
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
                message = "You do not have permission to delete this tag!";
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
            onDeleted?.();
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
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-destructive hover:text-destructive"
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the tag and unlink it from{" "}
            {tag.products.length}{" "}
            {tag.products.length > 1 ? "products" : "product"}. This action
            cannot be undone.
          </AlertDialogDescription>
          <div className="space-y-2 pt-2 w-full">
            <p className="text-xs text-muted-foreground">
              Type &apos;{confirmValue}&apos; to confirm the deletion
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Type '${confirmValue}'`}
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoaderButton
            variant="destructive"
            size="sm"
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
