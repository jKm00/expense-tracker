import { DeleteConfirmDialog } from "@/components/custom/delete-confirm-dialog";
import { toast } from "sonner";
import { productMutations } from "../products.mutations";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function DeleteProductDialog({
  productId,
  children,
}: {
  productId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const mutation = productMutations.deleteProduct();

  function handleDelete() {
    mutation.mutate(
      {
        productId,
      },
      {
        onSuccess: (res) => {
          const [err] = res;
          if (err) {
            let message: string;
            const reason = err.reason;
            switch (reason) {
              case "PRODUCT_NOT_FOUND":
                message =
                  "Product was not found and was therefore not deleted...";
                break;
              case "PRODUCT_UNAUTHORIZED":
                message =
                  "You do not have permission to delete this product!";
                break;
              case "PRODUCT_DELETE_FAILED":
              case "PRODUCT_DB_ERROR":
              case "UNEXPECTED_DB_ERROR":
                message =
                  "Something unexpected happened when trying to delete the product. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Product deleted!");
            setOpen(false);
            navigate({
              to: "/dashboard/products",
            });
          }
        },
      },
    );
  }

  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete product?"
      description={
        <>
          This product will be archived. It will no longer appear in product
          lists, but historical transactions will still reference it.
        </>
      }
      isLoading={mutation.isPending}
      onDelete={handleDelete}
    >
      {children}
    </DeleteConfirmDialog>
  );
}
