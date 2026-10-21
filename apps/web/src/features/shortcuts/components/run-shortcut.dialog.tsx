import { LoaderButton } from "@/components/custom/loader.button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ShortcutWithProducts } from "../shortcuts.models";
import { useRunShortcut } from "./use-run-shortcut";

const PRICE_PATTERN = /^\d+(\.\d+)?$/;

export function RunShortcutDialog({
  shortcut,
  open,
  onOpenChange,
}: {
  shortcut: ShortcutWithProducts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, isPending } = useRunShortcut();
  const askProduct = shortcut.products.length > 1;
  const [price, setPrice] = useState(shortcut.price ?? "");
  const normalizedPrice = price.trim().replace(",", ".");
  const priceValid = PRICE_PATTERN.test(normalizedPrice);

  function execute(productId: string) {
    if (!priceValid || !productId || isPending) return;
    run(shortcut, { productId, price: normalizedPrice }, () =>
      onOpenChange(false),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!askProduct) execute(shortcut.products[0]?.id ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shortcut.name}</DialogTitle>
          <DialogDescription>
            {askProduct
              ? "Enter the price, then tap a product to save."
              : "Enter the price."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="shortcut-price"
              className="text-xs font-medium text-muted-foreground"
            >
              Price
            </Label>
            <Input
              id="shortcut-price"
              autoFocus
              inputMode="decimal"
              placeholder="123.45"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-11 md:h-9 text-base md:text-sm px-3"
            />
          </div>
          {askProduct ? (
            <div
              role="group"
              aria-label="Products"
              className="grid grid-cols-2 gap-2"
            >
              {shortcut.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={!priceValid || isPending}
                  onClick={() => execute(product.id)}
                  className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {product.name}
                </button>
              ))}
            </div>
          ) : (
          <LoaderButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            disabled={!priceValid || isPending}
          >
            Save transaction
          </LoaderButton>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
