import { TagWithProduct } from "../tags.models";
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
import { tagsMutations } from "../tags.mutations";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LoaderButton } from "@/components/custom/loader.button";
import { AlertTriangle } from "lucide-react";

export function DeleteTagDialog({
  tag,
  children,
}: {
  tag: TagWithProduct;
  children: React.ReactNode;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const confirmValue = tag.name.toLowerCase();

  const mutation = tagsMutations.deleteTag();

  function handleDelete() {
    mutation.mutate(
      { tagId: tag.id },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;

            const reason = error.reason;
            switch (reason) {
              case "TAG_NOT_FOUND":
                message = "No tag was found and could therefore not be deleted";
                break;
              case "TAG_UNATHORIZED":
                message = "You do not have permission to delete this tag";
                break;
              case "TAG_NOT_RETURNED":
              case "TAG_DB_ERROR":
                message =
                  "Something unexpected happened when tring to delete that tag. Please try again!";
                break;
              default:
                message = `Failed to delete tag: ${reason satisfies never}. Please try again!`;
            }

            toast.error(message);
          } else {
            toast.success("Tag deleted!");
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild className="flex justify-between w-full">
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-center bg-destructive/10 rounded-full size-10 mb-2">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div>
            <AlertDialogTitle className="mb-2">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="mb-4">
              This will permanently delete the tag and remove all its links to
              products. This action cannot be undone.
            </AlertDialogDescription>
            <p className="text-sm text-muted-foreground mb-1.5">
              Type '{confirmValue}' to confirm the deletion
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
            onClick={handleDelete}
            isLoading={mutation.isPending}
            disabled={confirmInput !== confirmValue || mutation.isPending}
            variant="destructive"
          >
            Delete
          </LoaderButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
