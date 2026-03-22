import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { transactionMutations } from "../transaction.mutations";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function DeleteTransactionDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const mutation = transactionMutations.deleteTransaction();

  function handleDelete() {
    mutation.mutate(
      { id },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            const errorMsg =
              "message" in err
                ? err.message
                : "error" in err
                  ? err.error
                  : "Failed to delete transaction";
            toast.error(errorMsg);
          } else {
            toast.success("Transaction deleted");
            navigate({ to: "/dashboard/transactions" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Transaction</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this transaction?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            transaction.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
