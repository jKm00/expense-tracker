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
import { AlertTriangle } from "lucide-react";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";
import { recurringMutations } from "../recurring.mutations";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function DeleteRecurringDialog({
  recurringId,
  children,
}: {
  recurringId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const mutation = recurringMutations.deleteRecurring();

  function handleDelete() {
    mutation.mutate(
      { recurringId },
      {
        onSuccess: (res) => {
          const [err] = res;
          if (err) {
            let message: string;
            const reason = err.reason;
            switch (reason) {
              case "RECURRING_NOT_FOUND":
                message = "Recurring transaction was not found";
                break;
              case "RECURRING_UNAUTHORIZED":
                message = "You do not have permission to delete this";
                break;
              case "RECURRING_DELETE_FAILED":
              case "RECURRING_DB_ERROR":
                message = "Failed to delete. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Recurring transaction deleted!");
            setOpen(false);
            navigate({ to: "/dashboard/recurring" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <AlertDialogTitle>Delete recurring transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This recurring transaction will be archived. It will no longer appear
            in your recurring list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoaderButton
            variant="destructive"
            size="sm"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </LoaderButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
