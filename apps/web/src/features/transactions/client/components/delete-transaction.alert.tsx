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
import { transactionMutations } from "../transactions.mutations";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function DeleteTransactionDialog({
  transactionId,
  children,
}: {
  transactionId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const mutation = transactionMutations.deleteTransaction();

  function handleDelete() {
    mutation.mutate(
      {
        transactionId,
      },
      {
        onSuccess: (res) => {
          const [err] = res;
          if (err) {
            let message: string;
            const reason = err.reason;
            switch (reason) {
              case "TRANSACTION_NOT_FOUND":
                message =
                  "Transaction was not found and was therefore not deleted...";
                break;
              case "TRANSACTION_UNAUTHORIZED":
                message =
                  "You do not have permission to delete this transaction!";
                break;
              case "TRANSACTION_DB_ERROR":
              case "TRANSACTION_NOT_RETURNED":
              case "UNEXPECTED_DB_ERROR":
                message =
                  "Something unexpected happened when trying to delete the transaction. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Transaction deleted!");
            setOpen(false);
            navigate({
              to: "/dashboard/transactions",
            });
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
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone and will permanently delete the
            transaction!
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
