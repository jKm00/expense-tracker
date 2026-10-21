import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoaderButton } from "@/components/custom/loader.button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { shortcutMutations } from "../shortcuts.mutations";

export function DeleteShortcutDialog({
  shortcutId,
  shortcutName,
  open,
  onOpenChange,
}: {
  shortcutId: string;
  shortcutName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = shortcutMutations.deleteShortcut();

  function handleDelete() {
    mutation.mutate(
      { shortcutId },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error(
              error.reason === "SHORTCUT_NOT_FOUND"
                ? "Shortcut was not found"
                : "Failed to delete shortcut. Please try again!",
            );
          } else {
            toast.success("Shortcut deleted");
            onOpenChange(false);
          }
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <AlertDialogTitle>Delete "{shortcutName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            The shortcut will be removed. Transactions you already saved with it
            are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep shortcut</AlertDialogCancel>
          <LoaderButton
            variant="destructive"
            size="sm"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={handleDelete}
          >
            Delete shortcut
          </LoaderButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
