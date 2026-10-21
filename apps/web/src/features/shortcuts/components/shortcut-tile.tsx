import { cn } from "@/lib/utils";
import { formatAmount } from "@/utils/format";
import { Loader2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { ShortcutWithProducts } from "../shortcuts.models";
import { shortcutNeedsInput } from "../shortcuts.utils";
import { RunShortcutDialog } from "./run-shortcut.dialog";
import { useRunShortcut } from "./use-run-shortcut";

export function shortcutSummary(shortcut: ShortcutWithProducts) {
  const product =
    shortcut.products.length === 1
      ? shortcut.products[0].name
      : `${shortcut.products.length} products`;
  const price =
    shortcut.price == null ? "Ask price" : formatAmount(shortcut.price);
  return [shortcut.store, product, price].filter(Boolean).join(" · ");
}

export function ShortcutTile({
  shortcut,
  className,
}: {
  shortcut: ShortcutWithProducts;
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { run, isPending } = useRunShortcut();
  const unavailable = shortcut.products.length === 0;
  const Icon = shortcut.type === "expense" ? Minus : Plus;

  function handleClick() {
    if (shortcutNeedsInput(shortcut)) {
      setDialogOpen(true);
      return;
    }
    run(shortcut, {
      productId: shortcut.products[0].id,
      price: shortcut.price!,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={unavailable || isPending}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
          className,
        )}
      >
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            shortcut.type === "expense"
              ? "bg-expense/10 text-expense"
              : "bg-income/10 text-income",
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{shortcut.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {unavailable ? "Products no longer available" : shortcutSummary(shortcut)}
          </p>
        </div>
      </button>
      {dialogOpen && (
        <RunShortcutDialog
          shortcut={shortcut}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
