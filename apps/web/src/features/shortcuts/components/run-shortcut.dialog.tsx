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
import { cn } from "@/lib/utils";
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
  const [productId, setProductId] = useState(
    askProduct ? "" : shortcut.products[0]?.id ?? "",
  );
  const [price, setPrice] = useState(shortcut.price ?? "");
  const normalizedPrice = price.trim().replace(",", ".");
  const priceValid = PRICE_PATTERN.test(normalizedPrice);
  const canSubmit = Boolean(productId) && priceValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    run(shortcut, { productId, price: normalizedPrice }, () =>
      onOpenChange(false),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shortcut.name}</DialogTitle>
          <DialogDescription>
            {askProduct
              ? "Choose a product and enter the price."
              : "Enter the price."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {askProduct && (
            <div
              role="radiogroup"
              aria-label="Product"
              className="grid grid-cols-2 gap-2"
            >
              {shortcut.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  role="radio"
                  aria-checked={productId === product.id}
                  onClick={() => setProductId(product.id)}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors",
                    productId === product.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  {product.name}
                </button>
              ))}
            </div>
          )}
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
          <LoaderButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            disabled={!canSubmit || isPending}
          >
            Save transaction
          </LoaderButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
