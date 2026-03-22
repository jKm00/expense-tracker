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
import { recurringMutations } from "../recurring.mutations";
import { useNavigate } from "@tanstack/react-router";

export function DeleteRecurringProductDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const mutation = recurringMutations.deleteRecurringProduct();

  function handleDelete() {
    mutation.mutate(
      {
        id,
      },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            // TODO: HAndle...
            console.log(err.message);
          } else {
            navigate({ to: "/dashboard/recurring" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Reccuring Product</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete the recurring product?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            recurring product from our servers. If you don't want to delete, you
            can de-active it instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete Recurring Product
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
