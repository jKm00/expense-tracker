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
import { productMutations } from "../product.mutations";
import { productQueries } from "../product.queries";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function getWarningMessage(usage: {
  transactionCount: number;
  hasRecurring: boolean;
}): string {
  const { transactionCount, hasRecurring } = usage;

  if (transactionCount > 0 && hasRecurring) {
    return `This will also delete ${transactionCount} transaction${transactionCount === 1 ? "" : "s"} and its recurring configuration.`;
  }
  if (transactionCount > 0) {
    return `This will also delete ${transactionCount} transaction${transactionCount === 1 ? "" : "s"} associated with it.`;
  }
  if (hasRecurring) {
    return "This will also remove its recurring configuration.";
  }
  return "This action cannot be undone.";
}

export function DeleteProductDialog({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const mutation = productMutations.deleteProduct();

  // Product usage is prefetched in the route loader, so this should be instant
  const { data: usageData } = useQuery(
    productQueries.getProductUsageOptions(productId),
  );

  const [usageErr, usage] = usageData ?? [null, null];
  const warningMessage =
    usage && !usageErr
      ? getWarningMessage(usage)
      : "This action cannot be undone.";

  function handleDelete() {
    mutation.mutate(
      { productId },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            const errorMsg: string =
              "message" in err
                ? String(err.message)
                : "error" in err
                  ? String(err.error)
                  : "Failed to delete product";
            toast.error(errorMsg);
          } else {
            toast.success("Product deleted");
            navigate({ to: "/dashboard/products" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Product</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this product?
          </AlertDialogTitle>
          <AlertDialogDescription>{warningMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete Product
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
