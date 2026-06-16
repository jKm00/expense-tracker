import { DeleteConfirmDialog } from "@/components/custom/delete-confirm-dialog";
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
    <DeleteConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete recurring transaction?"
      description={
        <>
          This recurring transaction will be archived. It will no longer appear
          in your recurring list.
        </>
      }
      isLoading={mutation.isPending}
      onDelete={handleDelete}
    >
      {children}
    </DeleteConfirmDialog>
  );
}
