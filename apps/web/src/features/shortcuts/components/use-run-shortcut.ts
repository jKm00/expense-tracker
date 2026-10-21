import { toast } from "sonner";
import { transactionMutations } from "@/features/transactions/transactions.mutations";
import { ShortcutWithProducts } from "../shortcuts.models";

export function useRunShortcut() {
  const saveMutation = transactionMutations.saveTransaction();
  const deleteMutation = transactionMutations.deleteTransaction();

  function undo(transactionId: string) {
    deleteMutation
      .mutateAsync({ transactionId })
      .then(([error]) => {
        if (error) {
          toast.error("Could not undo the transaction");
        } else {
          toast.success("Transaction undone");
        }
      })
      .catch(() => {});
  }

  function run(
    shortcut: ShortcutWithProducts,
    input: { productId: string; price: string },
    onSaved?: () => void,
  ) {
    const product = shortcut.products.find((p) => p.id === input.productId);
    if (!product) {
      toast.error("Select a product first");
      return;
    }

    saveMutation.mutate(
      {
        source: "manual",
        store: shortcut.store ?? undefined,
        date: new Date(),
        entries: [
          {
            product: { id: product.id, name: product.name },
            quantity: "1",
            price: input.price,
            type: shortcut.type,
            tagIds: [],
          },
        ],
      },
      {
        onSuccess: ([error, transaction]) => {
          if (error) {
            toast.error(error.message);
            return;
          }
          onSaved?.();
          toast.success(`Saved ${shortcut.name}`, {
            action: { label: "Undo", onClick: () => undo(transaction.id) },
          });
        },
      },
    );
  }

  return { run, isPending: saveMutation.isPending };
}
